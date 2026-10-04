package com.w16a.danish.interaction.mapper;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.MybatisSqlSessionFactoryBuilder;
import org.apache.ibatis.mapping.Environment;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.transaction.jdbc.JdbcTransactionFactory;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class InteractionStatisticsPersistenceTest {
    private SqlSession session;
    private SubmissionVotesMapper votes;
    private SubmissionCommentsMapper comments;

    @BeforeEach
    void setUp() {
        var source = new JdbcDataSource();
        source.setURL("jdbc:h2:mem:interaction_stats_" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1");
        var jdbc = new JdbcTemplate(source);
        jdbc.execute("CREATE TABLE competitions(id VARCHAR(36),is_public BOOLEAN)");
        jdbc.execute("CREATE TABLE submission_records(id VARCHAR(36),competition_id VARCHAR(36),review_status VARCHAR(16))");
        jdbc.execute("CREATE TABLE submission_votes(id VARCHAR(36),submission_id VARCHAR(36))");
        jdbc.execute("CREATE TABLE submission_comments(id VARCHAR(36),submission_id VARCHAR(36))");
        jdbc.update("INSERT INTO competitions VALUES ('c1',TRUE),('private',FALSE)");
        jdbc.update("INSERT INTO submission_records VALUES ('s1','c1','APPROVED'),('s2','c1','PENDING'),('c1','private','APPROVED')");
        jdbc.update("INSERT INTO submission_votes VALUES ('v1','s1'),('v2','s2'),('v3','c1')");
        jdbc.update("INSERT INTO submission_comments VALUES ('m1','s1'),('m2','s1'),('m3','s2'),('m4','c1')");
        var configuration = new MybatisConfiguration();
        configuration.setEnvironment(new Environment("local", new JdbcTransactionFactory(), source));
        configuration.addMapper(SubmissionVotesMapper.class);
        configuration.addMapper(SubmissionCommentsMapper.class);
        session = new MybatisSqlSessionFactoryBuilder().build(configuration).openSession(true);
        votes = session.getMapper(SubmissionVotesMapper.class);
        comments = session.getMapper(SubmissionCommentsMapper.class);
    }

    @AfterEach
    void close() {
        if (session != null) session.close();
    }

    @Test
    void competitionTotalsJoinAllItsSubmissionsAndCannotConfuseAnOverlappingSubmissionId() {
        assertThat(votes.countCompetitionVotes("c1")).isEqualTo(2);
        assertThat(comments.countCompetitionComments("c1")).isEqualTo(3);
        assertThat(votes.countCompetitionVotes("private")).isEqualTo(1);
        assertThat(comments.countCompetitionComments("private")).isEqualTo(1);
        assertThat(votes.countCompetitionVotes("missing")).isZero();
    }

    @Test
    void publicPlatformTotalsExcludePrivateCompetitionsAndUnapprovedSubmissions() {
        assertThat(votes.countPublicVotes()).isEqualTo(1);
        assertThat(comments.countPublicComments()).isEqualTo(2);
    }
}
