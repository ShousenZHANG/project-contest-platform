package com.w16a.danish.judge.service.impl;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.spring.MybatisSqlSessionFactoryBean;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.common.domain.enums.*;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.judge.domain.dto.*;
import com.w16a.danish.judge.domain.vo.SubmissionInfoVO;
import com.w16a.danish.judge.feign.SubmissionServiceClient;
import com.w16a.danish.judge.gateway.CompetitionGateway;
import com.w16a.danish.judge.mapper.*;
import com.w16a.danish.judge.service.*;
import org.apache.ibatis.session.SqlSessionFactory;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.*;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.context.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Real SQL and Spring transactions; only sibling HTTP services are substituted. */
class JudgeScoringPersistenceTest {
    private AnnotationConfigApplicationContext context;
    private ISubmissionJudgesService service;
    private DataSource database;
    private SubmissionInfoVO submission;

    @BeforeEach void setUp() {
        context = new AnnotationConfigApplicationContext(Persistence.class);
        database = context.getBean(DataSource.class);
        service = context.getBean(ISubmissionJudgesService.class);
        CompetitionResponseVO competition = new CompetitionResponseVO();
        competition.setId("c"); competition.setStatus(CompetitionStatus.COMPLETED);
        competition.setParticipationType(ParticipationType.INDIVIDUAL); competition.setScoringCriteria(List.of("A", "B"));
        when(context.getBean(CompetitionGateway.class).require("c")).thenReturn(competition);
        submission = new SubmissionInfoVO();
        submission.setId("s"); submission.setCompetitionId("c"); submission.setUserId("p"); submission.setReviewStatus("APPROVED");
        when(context.getBean(SubmissionServiceClient.class).getSubmissionsByIds(List.of("s")))
                .thenReturn(ResponseEntity.ok(List.of(submission)));
    }

    @AfterEach void close() { if (context != null) context.close(); }

    @Test void persistedCriteriaAndTotalsUseServerMeanAndMonotonicVersion() throws Exception {
        service.judgeSubmission(new RequestContext("j1", "JUDGE"), body("10", "0"));
        try (var connection = database.getConnection(); var statement = connection.createStatement();
             var result = statement.executeQuery("SELECT total_score FROM submission_judges")) {
            assertThat(result.next()).isTrue(); assertThat(result.getBigDecimal(1)).isEqualByComparingTo("5.00");
        }
        service.updateJudgement(new RequestContext("j1", "JUDGE"), "s", body("10", "8"));
        try (var connection = database.getConnection(); var statement = connection.createStatement()) {
            try (var result = statement.executeQuery("SELECT total_score FROM submission_judges")) {
                assertThat(result.next()).isTrue(); assertThat(result.getBigDecimal(1)).isEqualByComparingTo("9.00");
            }
            try (var result = statement.executeQuery("SELECT COUNT(*) FROM submission_judge_scores")) {
                result.next(); assertThat(result.getInt(1)).isEqualTo(2);
            }
            try (var result = statement.executeQuery("SELECT score_version FROM competition_award_runs")) {
                result.next(); assertThat(result.getLong(1)).isEqualTo(2);
            }
        }
    }

    @Test void sqlFailureRollsBackJudgeDetailsAndRunTogether() throws Exception {
        try (var connection = database.getConnection(); var statement = connection.createStatement()) {
            statement.execute("ALTER TABLE submission_judge_scores ADD CONSTRAINT reject_b CHECK (criterion <> 'B')");
        }
        assertThatThrownBy(() -> service.judgeSubmission(new RequestContext("j1", "JUDGE"), body("10", "8")))
                .isInstanceOf(RuntimeException.class);
        for (String table : List.of("submission_judges", "submission_judge_scores", "competition_award_runs")) {
            try (var connection = database.getConnection(); var statement = connection.createStatement();
                 var result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
                result.next(); assertThat(result.getInt(1)).as(table).isZero();
            }
        }
        verify(context.getBean(DurableTasks.class), never()).enqueue(anyString(), anyString(), any(), any());
    }

    @Test void trustedSqlRoleAndOrganizerExclusionFilterAssignments() {
        assertThat(context.getBean(SubmissionJudgesMapper.class).selectValidJudgeIds("c")).containsExactly("j1");
        assertThatThrownBy(() -> service.judgeSubmission(new RequestContext("j2", "JUDGE"), body("10", "8")))
                .hasMessageContaining("not assigned");
        assertThatThrownBy(() -> service.judgeSubmission(new RequestContext("j3", "JUDGE"), body("10", "8")))
                .hasMessageContaining("not assigned");
    }

    @Test void persistedUniqueRecordCanBeRescoredAfterAReplacement() throws Exception {
        service.judgeSubmission(new RequestContext("j1", "JUDGE"), body("10", "0"));
        String id;
        try (var connection = database.getConnection(); var statement = connection.createStatement();
             var result = statement.executeQuery("SELECT id FROM submission_judges")) {
            result.next(); id = result.getString(1);
        }
        submission.setRevision(1);
        assertThat(service.getJudgingSubmission(new RequestContext("j1", "JUDGE"), "c", "s").isHasScored()).isFalse();
        service.judgeSubmission(new RequestContext("j1", "JUDGE"), body("10", "8"));
        try (var connection = database.getConnection(); var statement = connection.createStatement();
             var result = statement.executeQuery("SELECT id, submission_revision, score_schema_version, total_score FROM submission_judges")) {
            assertThat(result.next()).isTrue(); assertThat(result.getString(1)).isEqualTo(id);
            assertThat(result.getInt(2)).isEqualTo(1); assertThat(result.getInt(3)).isEqualTo(1);
            assertThat(result.getBigDecimal(4)).isEqualByComparingTo("9.00"); assertThat(result.next()).isFalse();
        }
        verify(context.getBean(DurableTasks.class)).enqueue("SUBMISSION_SCORE", "s", 2L,
                java.util.Map.of("score", new BigDecimal("9.00"), "revision", 1));
    }

    private SubmissionJudgeDTO body(String first, String second) {
        var a = new CriterionScoreDTO(); a.setCriterion("A"); a.setScore(new BigDecimal(first)); a.setWeight(new BigDecimal("100"));
        var b = new CriterionScoreDTO(); b.setCriterion("B"); b.setScore(new BigDecimal(second));
        var result = new SubmissionJudgeDTO(); result.setCompetitionId("c"); result.setSubmissionId("s"); result.setScores(List.of(a, b));
        return result;
    }

    @Configuration
    @EnableTransactionManagement
    static class Persistence {
        @Bean DataSource database() throws Exception {
            var database = new JdbcDataSource();
            database.setURL("jdbc:h2:mem:judging_" + System.nanoTime() + ";MODE=MySQL;DB_CLOSE_DELAY=-1");
            try (var connection = database.getConnection(); var statement = connection.createStatement()) {
                statement.execute("CREATE TABLE roles (id INT PRIMARY KEY, name VARCHAR(32))");
                statement.execute("CREATE TABLE user_roles (user_id VARCHAR(36), role_id INT)");
                statement.execute("CREATE TABLE competition_organizers (competition_id VARCHAR(36), user_id VARCHAR(36))");
                statement.execute("CREATE TABLE competition_judges (id VARCHAR(36) PRIMARY KEY, competition_id VARCHAR(36), user_id VARCHAR(36), created_at TIMESTAMP, updated_at TIMESTAMP)");
                statement.execute("CREATE TABLE competition_award_runs (competition_id CHAR(36) PRIMARY KEY, awarded_at TIMESTAMP NULL, score_version BIGINT NOT NULL DEFAULT 0)");
                statement.execute("CREATE TABLE submission_judges (id VARCHAR(36) PRIMARY KEY, competition_id VARCHAR(36), submission_id VARCHAR(36), judge_id VARCHAR(36), submission_revision INT NOT NULL DEFAULT 0, score_schema_version INT NOT NULL DEFAULT 0, total_score DECIMAL(4,2), judge_comments VARCHAR(2000), created_at TIMESTAMP, updated_at TIMESTAMP, UNIQUE(submission_id, judge_id))");
                statement.execute("CREATE TABLE submission_judge_scores (id VARCHAR(36) PRIMARY KEY, judge_record_id VARCHAR(36), submission_id VARCHAR(36), criterion VARCHAR(255), score DECIMAL(4,2), weight DECIMAL(5,2), CHECK(score >= 0 AND score <= 10))");
                statement.execute("INSERT INTO roles VALUES (1, 'Judge'), (2, 'Participant')");
                statement.execute("INSERT INTO user_roles VALUES ('j1',1), ('j2',2), ('j3',1)");
                statement.execute("INSERT INTO competition_judges(id,competition_id,user_id) VALUES ('a1','c','j1'), ('a2','c','j2'), ('a3','c','j3')");
                statement.execute("INSERT INTO competition_organizers VALUES ('c','j3')");
            }
            return database;
        }
        @Bean SqlSessionFactory sqlSessions(DataSource database) throws Exception {
            var factory = new MybatisSqlSessionFactoryBean(); factory.setDataSource(database);
            var configuration = new MybatisConfiguration(); configuration.setMapUnderscoreToCamelCase(true);
            configuration.addMapper(SubmissionJudgesMapper.class); configuration.addMapper(SubmissionJudgeScoresMapper.class);
            configuration.addMapper(AwardRunMapper.class); factory.setConfiguration(configuration);
            return factory.getObject();
        }
        @Bean SqlSessionTemplate template(SqlSessionFactory factory) { return new SqlSessionTemplate(factory); }
        @Bean SubmissionJudgesMapper judgesMapper(SqlSessionTemplate template) { return template.getMapper(SubmissionJudgesMapper.class); }
        @Bean SubmissionJudgeScoresMapper scoreDetailsMapper(SqlSessionTemplate template) { return template.getMapper(SubmissionJudgeScoresMapper.class); }
        @Bean AwardRunMapper runs(SqlSessionTemplate template) { return template.getMapper(AwardRunMapper.class); }
        @Bean PlatformTransactionManager transactions(DataSource database) { return new DataSourceTransactionManager(database); }
        @Bean CompetitionGateway competitions() { return mock(CompetitionGateway.class); }
        @Bean SubmissionServiceClient submissions() { return mock(SubmissionServiceClient.class); }
        @Bean DurableTasks tasks() { return mock(DurableTasks.class); }
        @Bean ICompetitionJudgesService assignments() { return mock(ICompetitionJudgesService.class); }
        @Bean ISubmissionJudgeScoresService scores(SqlSessionTemplate template) {
            var service = new SubmissionJudgeScoresServiceImpl();
            ReflectionTestUtils.setField(service, "baseMapper", template.getMapper(SubmissionJudgeScoresMapper.class));
            return service;
        }
        @Bean ISubmissionJudgesService service(ICompetitionJudgesService assignments, ISubmissionJudgeScoresService scores,
                CompetitionGateway competitions, SubmissionServiceClient submissions, AwardRunMapper runs, SubmissionJudgesMapper mapper, DurableTasks tasks) {
            var service = new SubmissionJudgesServiceImpl(assignments, scores, competitions, submissions, runs, tasks);
            ReflectionTestUtils.setField(service, "baseMapper", mapper); return service;
        }
    }
}
