package com.w16a.danish.registration.service.impl;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.MybatisSqlSessionFactoryBuilder;
import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.common.domain.enums.ParticipationType;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.registration.domain.dto.SubmissionReviewDTO;
import com.w16a.danish.registration.domain.po.CompetitionOrganizers;
import com.w16a.danish.registration.domain.po.CompetitionParticipants;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.feign.FileServiceClient;
import com.w16a.danish.registration.feign.UserServiceClient;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.mapper.SubmissionRecordsMapper;
import com.w16a.danish.registration.notify.SubmissionNotifier;
import com.w16a.danish.registration.notify.UploadRollbackCleanup;
import com.w16a.danish.registration.service.ICompetitionOrganizersService;
import com.w16a.danish.registration.service.ICompetitionParticipantsService;
import com.w16a.danish.registration.service.SubmissionScores;
import org.apache.ibatis.mapping.Environment;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mybatis.spring.SqlSessionTemplate;
import org.mybatis.spring.transaction.SpringManagedTransactionFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.Serializable;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Real overlapping Spring/JDBC transactions catch stale Java entities, without external services. */
class SubmissionMutationConcurrencyTest {
    private JdbcTemplate jdbc;
    private TransactionTemplate transaction;
    private DataSourceTransactionManager transactions;
    private SubmissionRecordsMapper mapper;
    private FileServiceClient files;
    private UserServiceClient users;
    private CompetitionGateway competitions;
    private DurableTasks tasks;
    private ICompetitionParticipantsService participants;
    private ICompetitionOrganizersService organizers;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        var source = new DriverManagerDataSource("jdbc:h2:mem:submission_race_" + UUID.randomUUID()
                + ";MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=5000", "sa", "");
        jdbc = new JdbcTemplate(source);
        transactions = new DataSourceTransactionManager(source);
        transaction = new TransactionTemplate(transactions);
        // The deliberately retained pre-lock Java entity reproduces the lost update at READ_COMMITTED too.
        transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        jdbc.execute("CREATE TABLE competitions(id VARCHAR(36) PRIMARY KEY,status VARCHAR(16))");
        jdbc.update("INSERT INTO competitions VALUES ('c1','ONGOING')");
        jdbc.execute("CREATE TABLE competition_award_runs(competition_id VARCHAR(36) PRIMARY KEY,awarded_at TIMESTAMP)");
        jdbc.update("INSERT INTO competition_award_runs VALUES ('c1',NULL)");
        jdbc.execute("CREATE TABLE competition_participants(id VARCHAR(36),competition_id VARCHAR(36),user_id VARCHAR(36))");
        jdbc.update("INSERT INTO competition_participants VALUES ('r1','c1','u1')");
        jdbc.execute("""
                CREATE TABLE submission_records(id VARCHAR(36) PRIMARY KEY,competition_id VARCHAR(36),user_id VARCHAR(36),team_id VARCHAR(36),
                title VARCHAR(255),description VARCHAR(1024),file_name VARCHAR(255),file_url VARCHAR(1024),file_type VARCHAR(255),
                review_status VARCHAR(16),review_comments VARCHAR(1024),reviewed_by VARCHAR(36),reviewed_at TIMESTAMP,total_score DECIMAL(5,2),
                revision INT,score_version BIGINT,created_at TIMESTAMP,updated_at TIMESTAMP)
                """);
        jdbc.update("INSERT INTO submission_records(id,competition_id,user_id,title,file_url,review_status,revision,score_version) "
                + "VALUES ('s1','c1','u1','Old','http://minio/submissions/old.pdf','APPROVED',3,5)");
        jdbc.execute("""
                CREATE TABLE durable_tasks(id VARCHAR(36) PRIMARY KEY,owner VARCHAR(64),kind VARCHAR(64),aggregate_id VARCHAR(128),
                aggregate_version BIGINT,payload CLOB,state VARCHAR(16),attempts INT,available_at TIMESTAMP,lease_token VARCHAR(36),
                lease_until TIMESTAMP,last_error VARCHAR(255),created_at TIMESTAMP)
                """);
        var configuration = new MybatisConfiguration();
        configuration.setMapUnderscoreToCamelCase(true);
        configuration.setEnvironment(new Environment("spring-h2", new SpringManagedTransactionFactory(), source));
        configuration.addMapper(SubmissionRecordsMapper.class);
        mapper = new SqlSessionTemplate(new MybatisSqlSessionFactoryBuilder().build(configuration)).getMapper(SubmissionRecordsMapper.class);
        tasks = new DurableTasks(jdbc, new ObjectMapper(), Clock.systemUTC(), "registration-service", List.of());
        files = mock(FileServiceClient.class);
        when(files.uploadSubmission(any())).thenAnswer(call -> {
            org.springframework.web.multipart.MultipartFile file = call.getArgument(0);
            return ResponseEntity.ok("http://minio/submissions/" + file.getOriginalFilename());
        });
        users = mock(UserServiceClient.class);
        var user = new UserBriefVO();
        user.setId("u1"); user.setName("Participant"); user.setEmail("test@example.com");
        when(users.getUserBriefById(anyString())).thenReturn(ResponseEntity.ok(user));
        competitions = mock(CompetitionGateway.class);
        var competition = new CompetitionResponseVO();
        competition.setName("Competition"); competition.setStatus(CompetitionStatus.ONGOING);
        competition.setParticipationType(ParticipationType.INDIVIDUAL);
        when(competitions.require("c1")).thenReturn(competition);
        participants = mock(ICompetitionParticipantsService.class);
        LambdaQueryChainWrapper<CompetitionParticipants> registration = mock(LambdaQueryChainWrapper.class);
        when(registration.eq(any(), any())).thenReturn(registration);
        when(registration.exists()).thenReturn(true);
        when(participants.lambdaQuery()).thenReturn(registration);
        organizers = mock(ICompetitionOrganizersService.class);
        LambdaQueryChainWrapper<CompetitionOrganizers> organizer = mock(LambdaQueryChainWrapper.class);
        when(organizer.eq(any(), any())).thenReturn(organizer);
        when(organizer.exists()).thenReturn(false);
        when(organizers.lambdaQuery()).thenReturn(organizer);
    }

    @AfterEach
    void close() { jdbc.execute("SHUTDOWN"); }

    @Test
    void reviewReloadsTheNewRevisionInsteadOfRestoringItsPreLockFile() throws Exception {
        var readOld = new CountDownLatch(1);
        var replacementCommitted = new CountDownLatch(1);
        var reviewer = service(mapper, ignored -> { readOld.countDown(); await(replacementCommitted); });
        var uploader = service(mapper, null);
        var review = new SubmissionReviewDTO();
        review.setSubmissionId("s1"); review.setReviewStatus("APPROVED"); review.setReviewComments("Current revision");
        try (var executor = Executors.newFixedThreadPool(2)) {
            var reviewing = executor.submit(() -> transaction.executeWithoutResult(ignored ->
                    reviewer.reviewSubmission(review, new RequestContext("admin", "ADMIN"))));
            try {
                assertThat(readOld.await(5, TimeUnit.SECONDS)).isTrue();
                var uploading = executor.submit(() -> upload(uploader, "replacement.pdf"));
                uploading.get(5, TimeUnit.SECONDS);
                replacementCommitted.countDown();
                reviewing.get(5, TimeUnit.SECONDS);
            } finally { replacementCommitted.countDown(); }
        }
        assertThat(jdbc.queryForObject("SELECT file_url FROM submission_records WHERE id='s1'", String.class))
                .isEqualTo("http://minio/submissions/replacement.pdf");
        assertThat(jdbc.queryForObject("SELECT revision FROM submission_records WHERE id='s1'", Integer.class)).isEqualTo(4);
        assertThat(jdbc.queryForObject("SELECT review_status FROM submission_records WHERE id='s1'", String.class)).isEqualTo("APPROVED");
        assertThat(jdbc.queryForObject("SELECT review_comments FROM submission_records WHERE id='s1'", String.class)).isEqualTo("Current revision");
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void deletionReloadsAndCleansUpAReplacementCommittedAfterItsInitialRead(boolean registrationCleanup) throws Exception {
        var readOld = new CountDownLatch(1);
        var replacementCommitted = new CountDownLatch(1);
        var deleter = service(mapper, ignored -> { readOld.countDown(); await(replacementCommitted); });
        var uploader = service(mapper, null);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var deleting = executor.submit(() -> transaction.executeWithoutResult(ignored -> {
                if (registrationCleanup) {
                    // Earlier registration checks may already have read the old work in this transaction.
                    deleter.getById("s1");
                    deleter.deleteSubmissionsByUserAndCompetition("u1", "c1");
                } else {
                    deleter.deleteSubmission("s1", new RequestContext("u1", "PARTICIPANT"));
                }
            }));
            try {
                assertThat(readOld.await(5, TimeUnit.SECONDS)).isTrue();
                var uploading = executor.submit(() -> upload(uploader, "replacement.pdf"));
                uploading.get(5, TimeUnit.SECONDS);
                replacementCommitted.countDown();
                deleting.get(5, TimeUnit.SECONDS);
            } finally { replacementCommitted.countDown(); }
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM submission_records", Integer.class)).isZero();
        assertThat(jdbc.queryForList("SELECT payload FROM durable_tasks", String.class))
                .hasSize(2).anyMatch(payload -> payload.contains("old.pdf"))
                .anyMatch(payload -> payload.contains("replacement.pdf"));
    }

    @Test
    void concurrentReplacementsAdvanceEachRevisionAndCleanUpTheActualPreviousObject() throws Exception {
        var firstOwnsLock = new CountDownLatch(1);
        var secondUploaded = new CountDownLatch(1);
        var observed = spy(mapper);
        doAnswer(call -> {
            SubmissionRecords current = mapper.lockOwnedSubmission("c1", "u1", null);
            firstOwnsLock.countDown();
            await(secondUploaded);
            return current;
        }).when(observed).lockOwnedSubmission("c1", "u1", null);
        var first = service(observed, null);
        var second = service(mapper, null);
        doAnswer(call -> { secondUploaded.countDown(); return ResponseEntity.ok("http://minio/submissions/second.pdf"); })
                .when(files).uploadSubmission(argThat(file -> file != null && "second.pdf".equals(file.getOriginalFilename())));
        try (var executor = Executors.newFixedThreadPool(2)) {
            var uploadingFirst = executor.submit(() -> upload(first, "first.pdf"));
            assertThat(firstOwnsLock.await(5, TimeUnit.SECONDS)).isTrue();
            var uploadingSecond = executor.submit(() -> upload(second, "second.pdf"));
            uploadingFirst.get(5, TimeUnit.SECONDS);
            uploadingSecond.get(5, TimeUnit.SECONDS);
        }
        assertThat(jdbc.queryForObject("SELECT file_url FROM submission_records WHERE id='s1'", String.class))
                .isEqualTo("http://minio/submissions/second.pdf");
        assertThat(jdbc.queryForObject("SELECT revision FROM submission_records WHERE id='s1'", Integer.class)).isEqualTo(5);
        assertThat(jdbc.queryForList("SELECT payload FROM durable_tasks", String.class))
                .anyMatch(payload -> payload.contains("old.pdf")).anyMatch(payload -> payload.contains("first.pdf"))
                .noneMatch(payload -> payload.contains("second.pdf"));
    }

    @Test
    void cancellationDuringUploadCannotCreateAnUnregisteredSubmission() {
        jdbc.update("DELETE FROM submission_records");
        var service = service(mapper, null);
        doAnswer(call -> {
            var cancellation = new TransactionTemplate(transactions);
            cancellation.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            cancellation.executeWithoutResult(ignored -> {
                mapper.ensureLifecycleLock("c1");
                mapper.lockLifecycle("c1");
                jdbc.update("DELETE FROM competition_participants WHERE id='r1'");
            });
            return ResponseEntity.ok("http://minio/submissions/replacement.pdf");
        }).when(files).uploadSubmission(any());
        assertThatThrownBy(() -> upload(service, "replacement.pdf")).isInstanceOf(BusinessException.class)
                .hasMessageContaining("must register");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM submission_records", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM competition_participants", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT payload FROM durable_tasks", String.class)).contains("replacement.pdf");
    }

    private SubmissionRecordsServiceImpl service(SubmissionRecordsMapper observed, Consumer<String> afterRead) {
        var service = new SubmissionRecordsServiceImpl(competitions, files, mock(SubmissionNotifier.class), users,
                new SubmissionScores(observed), tasks, new UploadRollbackCleanup(tasks, transactions)) {
            @Override public SubmissionRecords getById(Serializable id) {
                SubmissionRecords result = super.getById(id);
                if (afterRead != null) afterRead.accept(id.toString());
                return result;
            }
        };
        ReflectionTestUtils.setField(service, "baseMapper", observed);
        ReflectionTestUtils.setField(service, "competitionParticipantsService", participants);
        ReflectionTestUtils.setField(service, "competitionOrganizersService", organizers);
        return service;
    }

    private void upload(SubmissionRecordsServiceImpl service, String filename) {
        var file = new MockMultipartFile("file", filename, "application/pdf", "content".getBytes());
        transaction.executeWithoutResult(ignored -> service.submitWork(
                new RequestContext("u1", "PARTICIPANT"), "c1", filename, "Description", file));
    }

    private static void await(CountDownLatch latch) {
        try { if (!latch.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Interleaving timed out"); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw new IllegalStateException(interrupted); }
    }
}
