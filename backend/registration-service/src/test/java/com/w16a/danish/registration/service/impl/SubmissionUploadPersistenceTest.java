package com.w16a.danish.registration.service.impl;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.MybatisSqlSessionFactoryBuilder;
import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.registration.domain.po.CompetitionParticipants;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.feign.FileServiceClient;
import com.w16a.danish.registration.feign.UserServiceClient;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.mapper.SubmissionRecordsMapper;
import com.w16a.danish.registration.notify.SubmissionNotifier;
import com.w16a.danish.registration.service.ICompetitionParticipantsService;
import com.w16a.danish.registration.service.ISubmissionRecordsService;
import org.apache.ibatis.exceptions.PersistenceException;
import org.apache.ibatis.mapping.Environment;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.transaction.jdbc.JdbcTransactionFactory;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Exercises both upload entry points against real MyBatis-Plus SQL and a local database. */
class SubmissionUploadPersistenceTest {

    private static final String OLD_FILE = "http://minio/bucket/old.pdf";
    private static final String NEW_FILE = "http://minio/bucket/new.pdf";
    private static final LocalDateTime REVIEWED_AT = LocalDateTime.of(2026, 1, 2, 12, 0);
    private static final MockMultipartFile FILE =
            new MockMultipartFile("file", "new.pdf", "application/pdf", "content".getBytes());

    private ISubmissionRecordsService service;
    private SubmissionRecordsMapper mapper;
    private FileServiceClient files;
    private SubmissionNotifier notifier;
    private Connection connection;
    private SqlSession session;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() throws SQLException {
        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:submission_upload_" + UUID.randomUUID());
        // Keep one JDBC connection open for the lifetime of this isolated in-memory database.
        connection = dataSource.getConnection();
        try (var statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE submission_records (
                        id VARCHAR(36) PRIMARY KEY,
                        competition_id VARCHAR(36) NOT NULL,
                        user_id VARCHAR(36),
                        team_id VARCHAR(36),
                        title VARCHAR(255) CHECK (title <> 'invalid'),
                        description VARCHAR(1024),
                        file_name VARCHAR(255),
                        file_url VARCHAR(1024),
                        file_type VARCHAR(255),
                        review_status VARCHAR(16),
                        review_comments VARCHAR(1024),
                        reviewed_by VARCHAR(36),
                        reviewed_at TIMESTAMP,
                        total_score DECIMAL(10, 2),
                        created_at TIMESTAMP,
                        updated_at TIMESTAMP
                    )
                    """);
        }

        MybatisConfiguration configuration = new MybatisConfiguration();
        configuration.setEnvironment(new Environment("local", new JdbcTransactionFactory(), dataSource));
        configuration.setMapUnderscoreToCamelCase(true);
        configuration.addMapper(SubmissionRecordsMapper.class);
        session = new MybatisSqlSessionFactoryBuilder().build(configuration).openSession(true);
        mapper = session.getMapper(SubmissionRecordsMapper.class);

        CompetitionGateway competitions = mock(CompetitionGateway.class);
        CompetitionResponseVO competition = new CompetitionResponseVO();
        competition.setName("Competition");
        competition.setStatus(CompetitionStatus.ONGOING);
        when(competitions.require("c1")).thenReturn(competition);
        files = mock(FileServiceClient.class);
        when(files.uploadSubmission(FILE)).thenReturn(ResponseEntity.ok(NEW_FILE));
        UserServiceClient users = mock(UserServiceClient.class);
        when(users.isUserInTeam("u1", "t1")).thenReturn(ResponseEntity.ok(true));
        UserBriefVO user = new UserBriefVO();
        user.setName("Participant");
        user.setEmail("participant@example.com");
        when(users.getUserBriefById("u1")).thenReturn(ResponseEntity.ok(user));
        notifier = mock(SubmissionNotifier.class);

        ICompetitionParticipantsService participants = mock(ICompetitionParticipantsService.class);
        LambdaQueryChainWrapper<CompetitionParticipants> registrations = mock(LambdaQueryChainWrapper.class);
        when(registrations.eq(any(), any())).thenReturn(registrations);
        when(registrations.exists()).thenReturn(true);
        when(participants.lambdaQuery()).thenReturn(registrations);

        SubmissionRecordsServiceImpl implementation =
                new SubmissionRecordsServiceImpl(competitions, files, notifier, users);
        ReflectionTestUtils.setField(implementation, "baseMapper", mapper);
        ReflectionTestUtils.setField(implementation, "competitionParticipantsService", participants);
        service = implementation;
    }

    @AfterEach
    void closeDatabase() throws SQLException {
        if (session != null) {
            session.close();
        }
        if (connection != null) {
            connection.close();
        }
    }

    @ParameterizedTest(name = "Replacement clears persisted review and score; team={0}")
    @ValueSource(booleans = {false, true})
    void replacementClearsPersistedReviewAndScore(boolean team) throws SQLException {
        seedReviewedSubmission(team);

        upload(team, "New title");

        // Read via JDBC, bypassing MyBatis' session cache and the in-memory entity.
        try (var statement = connection.createStatement();
             ResultSet row = statement.executeQuery("SELECT * FROM submission_records")) {
            assertThat(row.next()).isTrue();
            assertThat(row.getString("id")).isEqualTo("s1");
            assertOwner(row, team);
            assertThat(row.getString("title")).isEqualTo("New title");
            assertThat(row.getString("description")).isEqualTo("New description");
            assertThat(row.getString("file_name")).isEqualTo("new.pdf");
            assertThat(row.getString("file_url")).isEqualTo(NEW_FILE);
            assertThat(row.getString("file_type")).isEqualTo("application/pdf");
            assertThat(row.getString("review_status")).isEqualTo("PENDING");
            assertThat(row.getObject("reviewed_by")).isNull();
            assertThat(row.getObject("reviewed_at")).isNull();
            assertThat(row.getObject("review_comments")).isNull();
            assertThat(row.getObject("total_score")).isNull();
            assertThat(row.next()).isFalse();
        }
        verify(files).deleteFile("bucket", "old.pdf");
        verify(notifier).sendSubmissionUploaded(any());
    }

    @ParameterizedTest(name = "First upload persists owner and PENDING; team={0}")
    @ValueSource(booleans = {false, true})
    void firstUploadPersistsSubmission(boolean team) throws SQLException {
        upload(team, "New title");

        try (var statement = connection.createStatement();
             ResultSet row = statement.executeQuery("SELECT * FROM submission_records")) {
            assertThat(row.next()).isTrue();
            assertThat(row.getString("id")).isNotBlank();
            assertOwner(row, team);
            assertThat(row.getString("file_url")).isEqualTo(NEW_FILE);
            assertThat(row.getString("review_status")).isEqualTo("PENDING");
            assertThat(row.getObject("reviewed_by")).isNull();
            assertThat(row.getObject("reviewed_at")).isNull();
            assertThat(row.getObject("review_comments")).isNull();
            assertThat(row.getObject("total_score")).isNull();
            assertThat(row.next()).isFalse();
        }
        verify(files, never()).deleteFile(anyString(), anyString());
    }

    @ParameterizedTest(name = "Rejected database update preserves original file; team={0}")
    @ValueSource(booleans = {false, true})
    void rejectedDatabaseUpdatePreservesOriginalSubmissionAndFile(boolean team) throws SQLException {
        seedReviewedSubmission(team);

        assertThatThrownBy(() -> upload(team, "invalid")).isInstanceOf(PersistenceException.class);

        try (var statement = connection.createStatement();
             ResultSet row = statement.executeQuery("SELECT * FROM submission_records WHERE id = 's1'")) {
            assertThat(row.next()).isTrue();
            assertOwner(row, team);
            assertThat(row.getString("title")).isEqualTo("Old title");
            assertThat(row.getString("file_url")).isEqualTo(OLD_FILE);
            assertThat(row.getString("review_status")).isEqualTo("APPROVED");
            assertThat(row.getString("reviewed_by")).isEqualTo("organizer-1");
            assertThat(row.getTimestamp("reviewed_at").toLocalDateTime()).isEqualTo(REVIEWED_AT);
            assertThat(row.getString("review_comments")).isEqualTo("Approved work");
            assertThat(row.getBigDecimal("total_score")).isEqualByComparingTo("88.50");
        }
        verify(files, never()).deleteFile(anyString(), anyString());
        verify(notifier, never()).sendSubmissionUploaded(any());
    }

    private void seedReviewedSubmission(boolean team) {
        SubmissionRecords submission = new SubmissionRecords()
                .setId("s1")
                .setCompetitionId("c1")
                .setUserId(team ? null : "u1")
                .setTeamId(team ? "t1" : null)
                .setTitle("Old title")
                .setFileUrl(OLD_FILE)
                .setReviewStatus("APPROVED")
                .setReviewedBy("organizer-1")
                .setReviewedAt(REVIEWED_AT)
                .setReviewComments("Approved work")
                .setTotalScore(new BigDecimal("88.50"));
        assertThat(mapper.insert(submission)).isEqualTo(1);
    }

    private void upload(boolean team, String title) {
        RequestContext participant = new RequestContext("u1", "PARTICIPANT");
        if (team) {
            service.submitTeamWork(participant, "c1", "t1", title, "New description", FILE);
        } else {
            service.submitWork(participant, "c1", title, "New description", FILE);
        }
    }

    private void assertOwner(ResultSet row, boolean team) throws SQLException {
        assertThat(row.getString("competition_id")).isEqualTo("c1");
        assertThat(row.getString("user_id")).isEqualTo(team ? null : "u1");
        assertThat(row.getString("team_id")).isEqualTo(team ? "t1" : null);
    }
}
