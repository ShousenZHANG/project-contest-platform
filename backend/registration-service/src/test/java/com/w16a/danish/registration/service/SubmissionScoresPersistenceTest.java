package com.w16a.danish.registration.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.MybatisSqlSessionFactoryBuilder;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
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

    @BeforeEach
    void setUp() {
        var dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:visible_scores_" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1");
        jdbc = new JdbcTemplate(dataSource);
        jdbc.execute("CREATE TABLE submission_records(id VARCHAR(36) PRIMARY KEY,competition_id VARCHAR(36),revision INT,score_version BIGINT,review_status VARCHAR(16),total_score DECIMAL(5,2))");
        jdbc.execute("CREATE TABLE submission_judges(id VARCHAR(36),competition_id VARCHAR(36),submission_id VARCHAR(36),judge_id VARCHAR(36),submission_revision INT,score_schema_version INT,total_score DECIMAL(5,2))");
        jdbc.execute("CREATE TABLE competition_judges(competition_id VARCHAR(36),user_id VARCHAR(36))");
        jdbc.execute("CREATE TABLE competition_organizers(competition_id VARCHAR(36),user_id VARCHAR(36))");
        jdbc.execute("CREATE TABLE user_roles(user_id VARCHAR(36),role_id VARCHAR(36))");
        jdbc.execute("CREATE TABLE roles(id VARCHAR(36),name VARCHAR(36))");
        jdbc.update("INSERT INTO submission_records VALUES ('s1','c1',2,5,'APPROVED',8.50)");
        jdbc.update("INSERT INTO submission_judges VALUES ('j1','c1','s1','u1',2,1,8.50)");
        jdbc.update("INSERT INTO competition_judges VALUES ('c1','u1')");
        jdbc.update("INSERT INTO roles VALUES ('r1','Judge')");
        jdbc.update("INSERT INTO user_roles VALUES ('u1','r1')");
        var configuration = new MybatisConfiguration();
        configuration.setEnvironment(new Environment("local", new JdbcTransactionFactory(), dataSource));
        configuration.addMapper(SubmissionRecordsMapper.class);
        session = new MybatisSqlSessionFactoryBuilder().build(configuration).openSession(true);
        scores = new SubmissionScores(session.getMapper(SubmissionRecordsMapper.class));
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
            "UPDATE submission_records SET total_score=87.50"
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
        when(mapper.selectCurrentScoreIds(List.of("s1"))).thenReturn(List.of("s1"));
        assertThat(policy.visibleScore(record().setTotalScore(BigDecimal.ZERO))).isEqualByComparingTo("0");
    }

    @Test
    void manyResultsUseBoundedBatchesInsteadOfAQueryPerSubmission() {
        var mapper = mock(SubmissionRecordsMapper.class);
        when(mapper.selectCurrentScoreIds(anyList())).thenAnswer(call -> call.getArgument(0));
        var records = IntStream.range(0, 205).mapToObj(index -> record().setId("s" + index)).toList();
        assertThat(new SubmissionScores(mapper).visibleScores(records)).hasSize(205);
        verify(mapper, times(3)).selectCurrentScoreIds(argThat(ids -> ids.size() <= 100));
    }

    private static SubmissionRecords record() {
        return new SubmissionRecords().setId("s1").setCompetitionId("c1").setRevision(2)
                .setScoreVersion(5L).setReviewStatus("APPROVED").setTotalScore(new BigDecimal("8.50"));
    }
}
