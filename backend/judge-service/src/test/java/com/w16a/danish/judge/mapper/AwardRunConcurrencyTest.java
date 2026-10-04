package com.w16a.danish.judge.mapper;

import org.apache.ibatis.mapping.Environment;
import org.apache.ibatis.session.*;
import org.apache.ibatis.transaction.jdbc.JdbcTransactionFactory;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

class AwardRunConcurrencyTest {
    private JdbcDataSource dataSource;
    private SqlSessionFactory sessions;

    @BeforeEach void setUp() throws Exception {
        dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:award_" + System.nanoTime() + ";MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=5000");
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            statement.execute("CREATE TABLE competition_award_runs (competition_id CHAR(36) PRIMARY KEY, "
                    + "awarded_at TIMESTAMP NULL, score_version BIGINT NOT NULL DEFAULT 0)");
        }
        Configuration configuration = new Configuration(new Environment("test", new JdbcTransactionFactory(), dataSource));
        configuration.addMapper(AwardRunMapper.class);
        sessions = new SqlSessionFactoryBuilder().build(configuration);
    }

    @Test void concurrentAwardWaitsForCommittedImmutableRun() throws Exception {
        var entered = new CountDownLatch(1);
        var secondStarted = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Integer> first = executor.submit(() -> {
                try (var session = sessions.openSession(false)) {
                    AwardRunMapper mapper = session.getMapper(AwardRunMapper.class);
                    mapper.ensureRun("competition");
                    assertThat(mapper.lockRun("competition")).isNull();
                    entered.countDown();
                    if (!release.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("test release timed out");
                    int result = mapper.markAwarded("competition");
                    session.commit();
                    return result;
                }
            });
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            Future<LocalDateTime> second = executor.submit(() -> {
                try (var session = sessions.openSession(false)) {
                    secondStarted.countDown();
                    AwardRunMapper mapper = session.getMapper(AwardRunMapper.class);
                    mapper.ensureRun("competition");
                    LocalDateTime result = mapper.lockRun("competition");
                    session.commit();
                    return result;
                }
            });
            assertThat(secondStarted.await(5, TimeUnit.SECONDS)).isTrue();
            release.countDown();
            assertThat(first.get(8, TimeUnit.SECONDS)).isEqualTo(1);
            assertThat(second.get(8, TimeUnit.SECONDS)).isNotNull();
        }
        try (var session = sessions.openSession(false)) {
            AwardRunMapper mapper = session.getMapper(AwardRunMapper.class);
            assertThat(mapper.markAwarded("competition")).isZero();
        }
    }

    @Test void scoreVersionIsMonotonicAndRolledBackWithTheWrite() {
        try (var session = sessions.openSession(false)) {
            var mapper = session.getMapper(AwardRunMapper.class);
            mapper.ensureRun("c"); mapper.lockRun("c"); mapper.incrementScoreVersion("c");
            assertThat(mapper.scoreVersion("c")).isEqualTo(1);
            session.commit();
        }
        try (var session = sessions.openSession(false)) {
            var mapper = session.getMapper(AwardRunMapper.class);
            mapper.lockRun("c"); mapper.incrementScoreVersion("c");
            assertThat(mapper.scoreVersion("c")).isEqualTo(2);
            session.rollback();
        }
        try (var session = sessions.openSession()) {
            assertThat(session.getMapper(AwardRunMapper.class).scoreVersion("c")).isEqualTo(1);
        }
    }
}
