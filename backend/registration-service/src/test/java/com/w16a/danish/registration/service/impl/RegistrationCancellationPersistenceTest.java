package com.w16a.danish.registration.service.impl;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.MybatisSqlSessionFactoryBuilder;
import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.registration.domain.po.CompetitionOrganizers;
import com.w16a.danish.registration.feign.FileServiceClient;
import com.w16a.danish.registration.feign.UserServiceClient;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.mapper.CompetitionParticipantsMapper;
import com.w16a.danish.registration.mapper.CompetitionTeamsMapper;
import com.w16a.danish.registration.mapper.SubmissionRecordsMapper;
import com.w16a.danish.registration.notify.RegistrationNotifier;
import com.w16a.danish.registration.notify.SubmissionNotifier;
import com.w16a.danish.registration.notify.UploadRollbackCleanup;
import com.w16a.danish.registration.service.ICompetitionOrganizersService;
import org.apache.ibatis.mapping.Environment;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mybatis.spring.SqlSessionTemplate;
import org.mybatis.spring.transaction.SpringManagedTransactionFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/** All four domain cancellation paths use real SQL and the same Spring transaction. */
class RegistrationCancellationPersistenceTest {
    private JdbcTemplate jdbc;
    private TransactionTemplate transaction;
    private CompetitionParticipantsServiceImpl registrations;
    private CompetitionParticipantsMapper mapper;
    private FileServiceClient files;
    private CompetitionResponseVO competition;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        var dataSource = new DriverManagerDataSource("jdbc:h2:mem:cancel_" + UUID.randomUUID()
                + ";MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=5000", "sa", "");
        jdbc = new JdbcTemplate(dataSource);
        var transactions = new DataSourceTransactionManager(dataSource);
        transaction = new TransactionTemplate(transactions);
        jdbc.execute("CREATE TABLE competitions(id VARCHAR(36) PRIMARY KEY,status VARCHAR(16),end_date TIMESTAMP)");
        jdbc.update("INSERT INTO competitions(id,status) VALUES ('c1','ONGOING')");
        jdbc.execute("CREATE TABLE competition_award_runs(competition_id VARCHAR(36) PRIMARY KEY,awarded_at TIMESTAMP)");
        jdbc.update("INSERT INTO competition_award_runs VALUES ('c1',NULL)");
        jdbc.execute("CREATE TABLE competition_participants(id VARCHAR(36) PRIMARY KEY,competition_id VARCHAR(36),user_id VARCHAR(36),created_at TIMESTAMP,updated_at TIMESTAMP)");
        jdbc.update("INSERT INTO competition_participants(id,competition_id,user_id) VALUES ('r1','c1','u1')");
        jdbc.execute("CREATE TABLE competition_teams(id VARCHAR(36) PRIMARY KEY,competition_id VARCHAR(36),team_id VARCHAR(36),joined_at TIMESTAMP)");
        jdbc.update("INSERT INTO competition_teams(id,competition_id,team_id) VALUES ('rt1','c1','t1')");
        jdbc.execute("""
                CREATE TABLE submission_records(id VARCHAR(36) PRIMARY KEY,competition_id VARCHAR(36),user_id VARCHAR(36),team_id VARCHAR(36),
                title VARCHAR(255),description VARCHAR(1024),file_name VARCHAR(255),file_url VARCHAR(1024),file_type VARCHAR(255),
                review_status VARCHAR(16),review_comments VARCHAR(1024),reviewed_by VARCHAR(36),reviewed_at TIMESTAMP,total_score DECIMAL(10,2),
                revision INT DEFAULT 1,score_version BIGINT DEFAULT 0,created_at TIMESTAMP,updated_at TIMESTAMP)
                """);
        jdbc.update("INSERT INTO submission_records(id,competition_id,user_id,file_url,review_status) VALUES ('s1','c1','u1','http://minio/submissions/individual.pdf','APPROVED')");
        jdbc.update("INSERT INTO submission_records(id,competition_id,team_id,file_url,review_status) VALUES ('st1','c1','t1','http://minio/submissions/team.pdf','APPROVED')");
        jdbc.execute("""
                CREATE TABLE durable_tasks(id VARCHAR(36) PRIMARY KEY,owner VARCHAR(64) NOT NULL,kind VARCHAR(64) NOT NULL,
                aggregate_id VARCHAR(128),aggregate_version BIGINT,payload CLOB NOT NULL,state VARCHAR(16) NOT NULL,
                attempts INT NOT NULL,available_at TIMESTAMP NOT NULL,lease_token VARCHAR(36),lease_until TIMESTAMP,last_error VARCHAR(255),created_at TIMESTAMP NOT NULL)
                """);
        var configuration = new MybatisConfiguration();
        configuration.setEnvironment(new Environment("spring-h2", new SpringManagedTransactionFactory(), dataSource));
        configuration.setMapUnderscoreToCamelCase(true);
        configuration.addMapper(CompetitionParticipantsMapper.class);
        configuration.addMapper(CompetitionTeamsMapper.class);
        configuration.addMapper(SubmissionRecordsMapper.class);
        var session = new SqlSessionTemplate(new MybatisSqlSessionFactoryBuilder().build(configuration));
        mapper = session.getMapper(CompetitionParticipantsMapper.class);
        var teams = new CompetitionTeamsServiceImpl();
        ReflectionTestUtils.setField(teams, "baseMapper", session.getMapper(CompetitionTeamsMapper.class));
        var gateway = mock(CompetitionGateway.class);
        competition = new CompetitionResponseVO();
        competition.setName("Cancellation test");
        competition.setStatus(com.w16a.danish.common.domain.enums.CompetitionStatus.ONGOING);
        competition.setParticipationType(com.w16a.danish.common.domain.enums.ParticipationType.INDIVIDUAL);
        when(gateway.require("c1")).thenReturn(competition);
        var users = mock(UserServiceClient.class);
        var creator = new UserBriefVO();
        creator.setId("u1");
        creator.setName("Team creator");
        creator.setEmail("member@example.com");
        when(users.getTeamCreator("t1")).thenReturn(ResponseEntity.ok(creator));
        when(users.getUserBriefById(anyString())).thenReturn(ResponseEntity.ok(creator));
        var organizers = mock(ICompetitionOrganizersService.class);
        LambdaQueryChainWrapper<CompetitionOrganizers> query = mock(LambdaQueryChainWrapper.class);
        when(query.eq(any(), any())).thenReturn(query);
        when(query.exists()).thenReturn(true);
        when(organizers.lambdaQuery()).thenReturn(query);
        var tasks = new DurableTasks(jdbc, new ObjectMapper().findAndRegisterModules(), Clock.systemUTC(), "registration-service", List.of());
        files = mock(FileServiceClient.class);
        var submissions = new SubmissionRecordsServiceImpl(gateway, files, mock(SubmissionNotifier.class), users,
                new com.w16a.danish.registration.service.SubmissionScores(session.getMapper(SubmissionRecordsMapper.class)),
                tasks, new UploadRollbackCleanup(tasks, transactions));
        ReflectionTestUtils.setField(submissions, "baseMapper", session.getMapper(SubmissionRecordsMapper.class));
        registrations = new CompetitionParticipantsServiceImpl(gateway, organizers, users, submissions, mock(RegistrationNotifier.class), teams);
        ReflectionTestUtils.setField(registrations, "baseMapper", mapper);
    }

    @ParameterizedTest
    @CsvSource({"false,COMPLETED", "false,AWARDED", "false,CANCELED", "true,COMPLETED", "true,AWARDED", "true,CANCELED"})
    void registrationRechecksTheCurrentDatabaseStateDespiteAnOngoingRemoteSnapshot(boolean team, String status) {
        jdbc.update("DELETE FROM " + (team ? "competition_teams" : "competition_participants"));
        jdbc.update("UPDATE competitions SET status=? WHERE id='c1'", status);
        assertThatThrownBy(() -> register(team))
                .isInstanceOf(BusinessException.class).hasMessageContaining("registration closed before");
        assertThat(count(team ? "competition_teams" : "competition_participants")).isZero();
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void currentDatabaseDeadlineIsCheckedAfterLifecycleLockEvenWhenRemoteDeadlineIsAbsent(boolean team) {
        jdbc.update("DELETE FROM " + (team ? "competition_teams" : "competition_participants"));
        jdbc.update("UPDATE competitions SET end_date=DATEADD('SECOND',-1,CURRENT_TIMESTAMP) WHERE id='c1'");
        assertThatThrownBy(() -> register(team))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Registration deadline has passed");
        assertThat(count(team ? "competition_teams" : "competition_participants")).isZero();
    }

    @AfterEach
    void close() { jdbc.execute("SHUTDOWN"); }

    static Stream<Arguments> frozenPaths() {
        return Stream.of("participant", "organizer", "teamCreator", "teamOrganizer")
                .flatMap(path -> Stream.of("COMPLETED", "AWARDED").map(status -> Arguments.of(path, status)));
    }

    @ParameterizedTest
    @MethodSource("frozenPaths")
    void completedAndAwardedRegistrationCannotBeCanceledFromAnyPath(String path, String status) {
        jdbc.update("UPDATE competitions SET status=? WHERE id='c1'", status);
        assertThatThrownBy(() -> cancel(path)).isInstanceOfSatisfying(BusinessException.class,
                error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT));
        assertThat(count("competition_participants")).isEqualTo(1);
        assertThat(count("competition_teams")).isEqualTo(1);
        assertThat(count("submission_records")).isEqualTo(2);
        assertThat(count("durable_tasks")).isZero();
        verifyNoInteractions(files);
    }

    @ParameterizedTest
    @ValueSource(strings = {"participant", "organizer", "teamCreator", "teamOrganizer"})
    void finalizedAwardRunCannotBeBypassedByAStaleOngoingStatus(String path) {
        jdbc.update("UPDATE competition_award_runs SET awarded_at=CURRENT_TIMESTAMP WHERE competition_id='c1'");
        assertThatThrownBy(() -> cancel(path)).isInstanceOf(BusinessException.class).hasMessageContaining("results are retained");
        assertThat(count("submission_records")).isEqualTo(2);
        assertThat(count("durable_tasks")).isZero();
    }

    static Stream<Arguments> mutablePaths() {
        return Stream.of("participant", "organizer", "teamCreator", "teamOrganizer")
                .flatMap(path -> Stream.of("UPCOMING", "ONGOING", "CANCELED").map(status -> Arguments.of(path, status)));
    }

    @ParameterizedTest
    @MethodSource("mutablePaths")
    void authorizedCancellationCommitsRegistrationSubmissionAndDurableFileCleanupTogether(String path, String status) {
        jdbc.update("UPDATE competitions SET status=? WHERE id='c1'", status);
        cancel(path);
        boolean team = path.startsWith("team");
        assertThat(count(team ? "competition_teams" : "competition_participants")).isZero();
        assertThat(count(team ? "competition_participants" : "competition_teams")).isEqualTo(1);
        assertThat(count("submission_records")).isEqualTo(1);
        assertThat(count("durable_tasks")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT payload FROM durable_tasks", String.class)).contains(team ? "team.pdf" : "individual.pdf");
        assertThat(jdbc.queryForObject("SELECT state FROM durable_tasks", String.class)).isEqualTo("PENDING");
        verifyNoInteractions(files);
    }

    @Test
    void failedTeamRegistrationDeletionRollsBackSubmissionRemovalAndFileCleanup() {
        jdbc.execute("CREATE TABLE dependent_registration(id VARCHAR(36),registration_id VARCHAR(36) REFERENCES competition_teams(id))");
        jdbc.update("INSERT INTO dependent_registration VALUES ('dependent','rt1')");
        assertThatThrownBy(() -> cancel("teamCreator")).isInstanceOf(RuntimeException.class);
        assertThat(count("competition_teams")).isEqualTo(1);
        assertThat(count("submission_records")).isEqualTo(2);
        assertThat(count("durable_tasks")).isZero();
    }

    @Test
    void cancellationWaitingForScoringLockReadsTheCommittedStateAfterAcquiringIt() throws Exception {
        var locked = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var attempted = new CountDownLatch(1);
        var observedMapper = spy(mapper);
        doAnswer(invocation -> {
            attempted.countDown();
            return mapper.ensureLifecycleLock("c1");
        }).when(observedMapper).ensureLifecycleLock("c1");
        ReflectionTestUtils.setField(registrations, "baseMapper", observedMapper);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var scoring = executor.submit(() -> transaction.executeWithoutResult(status -> {
                mapper.ensureLifecycleLock("c1");
                mapper.lockLifecycle("c1");
                jdbc.update("UPDATE competitions SET status='COMPLETED' WHERE id='c1'");
                locked.countDown();
                try {
                    if (!release.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Lock test timed out");
                } catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
            }));
            try {
                assertThat(locked.await(5, TimeUnit.SECONDS)).isTrue();
                var cancellation = executor.submit(() -> cancel("participant"));
                assertThat(attempted.await(5, TimeUnit.SECONDS)).isTrue();
                release.countDown();
                scoring.get(5, TimeUnit.SECONDS);
                assertThatThrownBy(() -> cancellation.get(5, TimeUnit.SECONDS)).hasCauseInstanceOf(BusinessException.class);
            } finally { release.countDown(); }
        }
        assertThat(count("competition_participants")).isEqualTo(1);
        assertThat(count("submission_records")).isEqualTo(2);
        assertThat(count("durable_tasks")).isZero();
    }

    private void cancel(String path) {
        transaction.executeWithoutResult(ignored -> {
            switch (path) {
                case "participant" -> registrations.cancelRegistration("c1", new RequestContext("u1", "PARTICIPANT"));
                case "organizer" -> registrations.cancelByOrganizer("c1", "u1", new RequestContext("o1", "ORGANIZER"));
                case "teamCreator" -> registrations.cancelTeamRegistration("c1", "t1", new RequestContext("u1", "PARTICIPANT"));
                case "teamOrganizer" -> registrations.cancelTeamByOrganizer("c1", "t1", new RequestContext("o1", "ORGANIZER"));
                default -> throw new IllegalArgumentException(path);
            }
        });
    }

    private void register(boolean team) {
        competition.setParticipationType(team ? com.w16a.danish.common.domain.enums.ParticipationType.TEAM
                : com.w16a.danish.common.domain.enums.ParticipationType.INDIVIDUAL);
        transaction.executeWithoutResult(ignored -> {
            if (team) registrations.registerTeam("c1", "t1", new RequestContext("u1", "PARTICIPANT"));
            else registrations.register("c1", new RequestContext("u2", "PARTICIPANT"));
        });
    }

    private int count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class); }
}
