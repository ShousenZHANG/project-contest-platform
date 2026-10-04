package com.w16a.danish.registration.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.MybatisSqlSessionFactoryBuilder;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.domain.po.SubmissionScoreSource;
import com.w16a.danish.registration.mapper.SubmissionRecordsMapper;
import org.apache.ibatis.mapping.Environment;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.transaction.jdbc.JdbcTransactionFactory;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/** Exercises source validation against the actual mapper SQL, without external services. */
class SubmissionScoresPersistenceTest {
    private JdbcTemplate jdbc;
    private SqlSession session;
    private SubmissionScores scores;
    private SubmissionRecordsMapper mapper;

    @BeforeEach
    void setUp() {
        var dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:visible_scores_" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1");
        jdbc = new JdbcTemplate(dataSource);
        jdbc.execute("""
                CREATE TABLE submission_records(id VARCHAR(36) PRIMARY KEY,competition_id VARCHAR(36),revision INT,score_version BIGINT,
                review_status VARCHAR(16),total_score DECIMAL(5,2),user_id VARCHAR(36),team_id VARCHAR(36),title VARCHAR(255),description VARCHAR(1024),
                file_name VARCHAR(255),file_url VARCHAR(1024),file_type VARCHAR(255),review_comments VARCHAR(1024),reviewed_by VARCHAR(36),
                reviewed_at TIMESTAMP,created_at TIMESTAMP,updated_at TIMESTAMP)
                """);
        jdbc.execute("CREATE TABLE submission_judges(id VARCHAR(36),competition_id VARCHAR(36),submission_id VARCHAR(36),judge_id VARCHAR(36),submission_revision INT,score_schema_version INT,total_score DECIMAL(5,2))");
        jdbc.execute("CREATE TABLE competition_judges(competition_id VARCHAR(36),user_id VARCHAR(36))");
        jdbc.execute("CREATE TABLE competition_organizers(competition_id VARCHAR(36),user_id VARCHAR(36))");
        jdbc.execute("CREATE TABLE user_roles(user_id VARCHAR(36),role_id VARCHAR(36))");
        jdbc.execute("CREATE TABLE roles(id VARCHAR(36),name VARCHAR(36))");
        // JDBC reads the JSON text; no database-specific JSON functions are involved.
        jdbc.execute("CREATE TABLE competitions(id VARCHAR(36),scoring_criteria VARCHAR(2048))");
        jdbc.execute("CREATE TABLE submission_judge_scores(id VARCHAR(36),judge_record_id VARCHAR(36),submission_id VARCHAR(36),criterion VARCHAR(100),score DECIMAL(5,2))");
        jdbc.update("INSERT INTO competitions VALUES ('c1','[\"Innovation\",\"Quality\"]')");
        jdbc.update("INSERT INTO submission_judge_scores VALUES ('d1','j1','s1','Innovation',8),('d2','j1','s1','Quality',9)");
        jdbc.update("INSERT INTO submission_records(id,competition_id,revision,score_version,review_status,total_score) VALUES ('s1','c1',2,5,'APPROVED',8.50)");
        jdbc.update("INSERT INTO submission_judges VALUES ('j1','c1','s1','u1',2,1,8.50)");
        jdbc.update("INSERT INTO competition_judges VALUES ('c1','u1')");
        jdbc.update("INSERT INTO roles VALUES ('r1','Judge')");
        jdbc.update("INSERT INTO user_roles VALUES ('u1','r1')");
        var configuration = new MybatisConfiguration();
        configuration.setMapUnderscoreToCamelCase(true);
        configuration.setEnvironment(new Environment("local", new JdbcTransactionFactory(), dataSource));
        configuration.addMapper(SubmissionRecordsMapper.class);
        session = new MybatisSqlSessionFactoryBuilder().build(configuration).openSession(true);
        mapper = session.getMapper(SubmissionRecordsMapper.class);
        scores = new SubmissionScores(mapper);
    }

    @AfterEach
    void close() {
        if (session != null) session.close();
    }

    @Test
    void aCurrentVersionAndCurrentAssignedJudgeSourceExposeTheScore() {
        assertThat(scores.visibleScore(record())).isEqualByComparingTo("8.50");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "UPDATE submission_judges SET score_schema_version=0",
            "UPDATE submission_judges SET submission_revision=1",
            "UPDATE submission_judges SET competition_id='other'",
            "UPDATE submission_judges SET total_score=NULL",
            "UPDATE submission_judges SET total_score=85",
            "UPDATE roles SET name='Participant'",
            "DELETE FROM competition_judges",
            "INSERT INTO competition_organizers VALUES ('c1','u1')",
            "UPDATE submission_records SET score_version=0",
            "UPDATE submission_records SET review_status='PENDING'",
            "UPDATE submission_records SET total_score=87.50",
            "DELETE FROM submission_judge_scores WHERE id='d1'",
            "DELETE FROM submission_judge_scores",
            "UPDATE submission_judge_scores SET criterion='Invented' WHERE id='d1'",
            "UPDATE submission_judge_scores SET criterion='Quality' WHERE id='d1'",
            "UPDATE submission_judge_scores SET criterion='innovation' WHERE id='d1'",
            "UPDATE submission_judge_scores SET submission_id='other' WHERE id='d1'",
            "UPDATE submission_judge_scores SET score=NULL WHERE id='d1'",
            "UPDATE submission_judge_scores SET score=-1 WHERE id='d1'",
            "UPDATE submission_judge_scores SET score=10.01 WHERE id='d1'",
            "INSERT INTO submission_judge_scores VALUES ('d3','j1','s1','Innovation',8)",
            "INSERT INTO submission_judges VALUES ('j2','c1','s1','u1',2,1,8.50)",
            "INSERT INTO submission_judges VALUES ('j2','c1','s1','u1',2,1,NULL)",
            "UPDATE competitions SET scoring_criteria='[]'",
            "UPDATE competitions SET scoring_criteria='[\"Quality\",\"Quality\"]'",
            "UPDATE competitions SET scoring_criteria='[\"Quality\",\"Other\"]'",
            "UPDATE competitions SET scoring_criteria='[\" Quality\",\"Innovation\"]'",
            "UPDATE competitions SET scoring_criteria='[1,2]'",
            "UPDATE competitions SET scoring_criteria='invalid'",
            "UPDATE competitions SET scoring_criteria=NULL"
    })
    void aLegacyStaleOrUnauthorizedSourceNeverBecomesACurrentScore(String change) {
        jdbc.update(change);
        assertThat(scores.visibleScore(record())).isNull();
    }

    @Test
    void legacyValuesAreRejectedBeforeQueryingTheSourceAndZeroRemainsAValidScore() {
        var mapper = mock(SubmissionRecordsMapper.class);
        var policy = new SubmissionScores(mapper);
        assertThat(policy.visibleScore(record().setScoreVersion(0L))).isNull();
        assertThat(policy.visibleScore(record().setRevision(null))).isNull();
        assertThat(policy.visibleScore(record().setTotalScore(new BigDecimal("88")))).isNull();
        verifyNoInteractions(mapper);
        when(mapper.selectScoreSources(List.of("s1"))).thenReturn(List.of(source("s1")));
        assertThat(policy.visibleScore(record().setTotalScore(BigDecimal.ZERO))).isEqualByComparingTo("0");
    }

    @Test
    void manyResultsUseBoundedBatchesInsteadOfAQueryPerSubmission() {
        var mapper = mock(SubmissionRecordsMapper.class);
        when(mapper.selectScoreSources(anyList())).thenAnswer(call -> {
            List<String> ids = call.getArgument(0);
            return ids.stream().map(SubmissionScoresPersistenceTest::source).toList();
        });
        var records = IntStream.range(0, 205).mapToObj(index -> record().setId("s" + index)).toList();
        assertThat(new SubmissionScores(mapper).visibleScores(records)).hasSize(205);
        verify(mapper, times(3)).selectScoreSources(argThat(ids -> ids.size() <= 100));
    }

    @Test
    void anotherCompleteAssignedJudgeCanKeepTheScoreVisibleWhenOneJudgeHasDuplicateCurrentRecords() {
        jdbc.update("INSERT INTO submission_judges VALUES ('j2','c1','s1','u1',2,1,8.50),('j3','c1','s1','u2',2,1,8.50)");
        jdbc.update("INSERT INTO competition_judges VALUES ('c1','u2')");
        jdbc.update("INSERT INTO user_roles VALUES ('u2','r1')");
        jdbc.update("INSERT INTO submission_judge_scores VALUES ('d3','j3','s1','Innovation',8),('d4','j3','s1','Quality',9)");
        assertThat(scores.visibleScore(record())).isEqualByComparingTo("8.50");
        jdbc.update("DELETE FROM competition_judges WHERE user_id='u2'");
        session.clearCache();
        assertThat(scores.visibleScore(record())).isNull();
    }

    @Test
    void historicalRecordsDoNotInvalidateACompleteCurrentRecord() {
        jdbc.update("INSERT INTO submission_judges VALUES ('legacy','c1','s1','u1',1,0,85)");
        assertThat(scores.visibleScore(record())).isEqualByComparingTo("8.50");
    }

    @Test
    void sqlSortingUsesTheSameEvidenceAndKeepsUnknownScoresInTheListBeforePagination() {
        jdbc.update("INSERT INTO submission_records(id,competition_id,revision,score_version,review_status,total_score) " +
                "VALUES ('invalid','c1',2,5,'APPROVED',9.99),('unscored','c1',2,0,'APPROVED',NULL)");
        jdbc.update("INSERT INTO submission_judges VALUES ('bad','c1','invalid','u1',2,1,9.99)");
        jdbc.update("INSERT INTO submission_judge_scores VALUES ('bad-detail','bad','invalid','Innovation',9.99)");
        var query = new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SubmissionRecords>()
                .select("id").eq("competition_id", "c1");
        String order = scores.currentScoreOrder("c1", false, query.getParamNameValuePairs());
        assertThat(order).contains("#{ew.paramNameValuePairs.currentScoreId0}").doesNotContain("'s1'");
        query.getExpression().add(com.baomidou.mybatisplus.core.enums.SqlKeyword.ORDER_BY, () -> order);
        query.orderByAsc("id");
        assertThat(mapper.selectObjs(query)).containsExactly("s1", "invalid", "unscored");
        query.last("LIMIT 2");
        assertThat(mapper.selectObjs(query)).containsExactly("s1", "invalid");
        assertThat(scores.visibleScores(List.of(record(), record().setId("invalid").setTotalScore(new BigDecimal("9.99")))))
                .containsOnlyKeys("s1");
    }

    @Test
    void realAnalyticsAndVoReadsShareTheCompleteEvidenceBoundary() {
        var analytics = new com.w16a.danish.registration.service.impl.SubmissionAnalyticsServiceImpl(
                mock(com.w16a.danish.registration.gateway.CompetitionGateway.class), scores);
        org.springframework.test.util.ReflectionTestUtils.setField(analytics, "baseMapper", mapper);
        assertThat(analytics.getScoreStatistics("c1").getAverageScore()).isEqualByComparingTo("8.50");
        assertThat(analytics.getSubmissionsByIds(List.of("s1")).getFirst().getTotalScore()).isEqualByComparingTo("8.50");
        jdbc.update("DELETE FROM submission_judge_scores WHERE id='d1'");
        session.clearCache();
        assertThat(analytics.getScoreStatistics("c1").getAverageScore()).isNull();
        assertThat(analytics.getSubmissionsByIds(List.of("s1")).getFirst().getTotalScore()).isNull();
        assertThat(analytics.getScoredSubmissions("c1")).isEmpty();
    }

    private static SubmissionScoreSource source(String id) {
        return new SubmissionScoreSource().setSubmissionId(id).setJudgeId("judge").setJudgeRecordId(id + "-record")
                .setConfiguredCriteria("[\"Quality\"]").setJudgeTotal(new BigDecimal("8.50"))
                .setDetailId(id + "-detail").setDetailSubmissionId(id).setCriterion("Quality")
                .setCriterionScore(new BigDecimal("8.50"));
    }

    private static SubmissionRecords record() {
        return new SubmissionRecords().setId("s1").setCompetitionId("c1").setRevision(2)
                .setScoreVersion(5L).setReviewStatus("APPROVED").setTotalScore(new BigDecimal("8.50"));
    }
}
