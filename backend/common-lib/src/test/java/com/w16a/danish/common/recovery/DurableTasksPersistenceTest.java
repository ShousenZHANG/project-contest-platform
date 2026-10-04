package com.w16a.danish.common.recovery;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;

class DurableTasksPersistenceTest {
    private JdbcTemplate jdbc;
    private TransactionTemplate transaction;
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    private MutableClock clock;

    @BeforeEach
    void database() {
        var datasource = new DriverManagerDataSource("jdbc:h2:mem:tasks_" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(datasource);
        transaction = new TransactionTemplate(new DataSourceTransactionManager(datasource));
        jdbc.execute("""
                CREATE TABLE durable_tasks (
                    id VARCHAR(36) PRIMARY KEY, owner VARCHAR(64) NOT NULL, kind VARCHAR(64) NOT NULL,
                    aggregate_id VARCHAR(128), aggregate_version BIGINT, payload CLOB NOT NULL,
                    state VARCHAR(16) NOT NULL, attempts INT NOT NULL, available_at TIMESTAMP NOT NULL,
                    lease_token VARCHAR(36), lease_until TIMESTAMP, last_error VARCHAR(255), created_at TIMESTAMP NOT NULL
                )
                """);
        jdbc.execute("CREATE TABLE entries (id VARCHAR(36) PRIMARY KEY)");
        clock = new MutableClock(Instant.parse("2026-10-04T00:00:00Z"));
    }

    @AfterEach
    void close() {
        jdbc.execute("SHUTDOWN");
    }

    @Test
    void businessWriteAndEnqueuedTaskCommitOrRollbackTogether() {
        DurableTasks tasks = worker("registration-service", List.of());
        assertThatThrownBy(() -> tasks.enqueue("UPLOAD", "s1", 1L, Map.of("url", "new.pdf")))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("domain transaction");
        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO entries VALUES ('s1')");
            tasks.enqueue("UPLOAD", "s1", 1L, Map.of("url", "new.pdf"));
            throw new IllegalStateException("domain write failed");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(count("entries")).isZero();
        assertThat(count("durable_tasks")).isZero();

        String id = transaction.execute(status -> {
            jdbc.update("INSERT INTO entries VALUES ('s1')");
            return tasks.enqueue("UPLOAD", "s1", 3L, Map.of("url", "new.pdf"));
        });
        assertThat(count("entries")).isEqualTo(1);
        assertThat(state(id)).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT aggregate_version FROM durable_tasks WHERE id=?", Long.class, id)).isEqualTo(3L);
        assertThat(jdbc.queryForObject("SELECT payload FROM durable_tasks WHERE id=?", String.class, id)).contains("new.pdf");
    }

    @Test
    void serializationFailureDoesNotCommitDomainWrite() {
        DurableTasks tasks = worker("registration-service", List.of());
        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO entries VALUES ('s1')");
            tasks.enqueue("UPLOAD", "s1", null, new BrokenPayload());
        })).isInstanceOf(IllegalArgumentException.class).hasMessage("Task payload cannot be serialized");
        assertThat(count("entries")).isZero();
        assertThat(count("durable_tasks")).isZero();
    }

    @Test
    void twoWorkersRacingForOneTaskExecuteOneLeasedDelivery() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        AtomicInteger executions = new AtomicInteger();
        DurableTaskHandler handler = handler("DELIVER", task -> {
            executions.incrementAndGet();
            entered.countDown();
            if (!release.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("test worker timed out");
        });
        DurableTasks first = worker("registration-service", List.of(handler));
        DurableTasks second = worker("registration-service", List.of(handler));
        String id = enqueue(first, "DELIVER");
        CyclicBarrier start = new CyclicBarrier(2);
        try (var executor = Executors.newFixedThreadPool(2)) {
            CompletableFuture<Void> one = CompletableFuture.runAsync(() -> awaitAndDrain(start, first), executor);
            CompletableFuture<Void> two = CompletableFuture.runAsync(() -> awaitAndDrain(start, second), executor);
            try {
                assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
                CompletableFuture.anyOf(one, two).get(5, TimeUnit.SECONDS);
                assertThat(executions).hasValue(1);
                assertThat(state(id)).isEqualTo("PROCESSING");
            } finally {
                release.countDown();
            }
            CompletableFuture.allOf(one, two).get(5, TimeUnit.SECONDS);
        }
        assertThat(state(id)).isEqualTo("DONE");
        assertThat(attempts(id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT lease_token FROM durable_tasks WHERE id=?", String.class, id)).isNull();
    }

    @Test
    void restartWaitsForLiveLeaseThenRecoversExpiredLease() {
        AtomicInteger executions = new AtomicInteger();
        DurableTasks original = worker("judge-service", List.of());
        String id = enqueue(original, "DELIVER");
        jdbc.update("UPDATE durable_tasks SET state='PROCESSING',attempts=1,lease_token='abandoned',lease_until=? WHERE id=?",
                Timestamp.from(clock.instant().plusSeconds(120)), id);
        DurableTasks restarted = worker("judge-service", List.of(handler("DELIVER", task -> executions.incrementAndGet())));
        restarted.drain();
        assertThat(executions).hasValue(0);
        clock.advance(121);
        restarted.drain();
        assertThat(executions).hasValue(1);
        assertThat(state(id)).isEqualTo("DONE");
        assertThat(attempts(id)).isEqualTo(2);
    }

    @Test
    void retriesSurviveRestartAndRespectBackoffWithoutPersistingSecretMessages() {
        DurableTasks original = worker("registration-service", List.of(handler("DELIVER", task -> {
            throw new IllegalStateException("secret-bearing-url");
        })));
        String id = enqueue(original, "DELIVER");
        original.drain();
        assertThat(state(id)).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT last_error FROM durable_tasks WHERE id=?", String.class, id))
                .isEqualTo("IllegalStateException").doesNotContain("secret-bearing-url");
        AtomicInteger executions = new AtomicInteger();
        DurableTasks restarted = worker("registration-service", List.of(handler("DELIVER", task -> executions.incrementAndGet())));
        clock.advance(9);
        restarted.drain();
        assertThat(executions).hasValue(0);
        clock.advance(1);
        restarted.drain();
        assertThat(executions).hasValue(1);
        assertThat(state(id)).isEqualTo("DONE");
        assertThat(attempts(id)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT last_error FROM durable_tasks WHERE id=?", String.class, id)).isNull();
    }

    @Test
    void eighthFailureBecomesDeadAndNoLongerRuns() {
        AtomicInteger executions = new AtomicInteger();
        DurableTasks tasks = worker("registration-service", List.of(handler("DELIVER", task -> {
            executions.incrementAndGet();
            throw new IllegalStateException("delivery unavailable");
        })));
        String id = enqueue(tasks, "DELIVER");
        for (int attempt = 1; attempt <= 8; attempt++) {
            Instant started = clock.instant();
            tasks.drain();
            assertThat(attempts(id)).isEqualTo(attempt);
            assertThat(state(id)).isEqualTo(attempt == 8 ? "DEAD" : "PENDING");
            long delay = 5L << attempt;
            assertThat(jdbc.queryForObject("SELECT available_at FROM durable_tasks WHERE id=?", Timestamp.class, id).toInstant())
                    .isEqualTo(started.plusSeconds(delay));
            clock.advance(delay);
        }
        clock.advance(10000);
        tasks.drain();
        assertThat(executions).hasValue(8);
        assertThat(attempts(id)).isEqualTo(8);
    }

    @Test
    void ownersCannotClaimEachOthersTasks() {
        AtomicInteger registrations = new AtomicInteger();
        AtomicInteger judges = new AtomicInteger();
        DurableTasks registration = worker("registration-service", List.of(handler("DELIVER", task -> registrations.incrementAndGet())));
        DurableTasks judge = worker("judge-service", List.of(handler("DELIVER", task -> judges.incrementAndGet())));
        String registrationId = enqueue(registration, "DELIVER");
        String judgeId = enqueue(judge, "DELIVER");
        registration.drain();
        assertThat(registrations).hasValue(1);
        assertThat(judges).hasValue(0);
        assertThat(state(registrationId)).isEqualTo("DONE");
        assertThat(state(judgeId)).isEqualTo("PENDING");
        judge.drain();
        assertThat(judges).hasValue(1);
    }

    @Test
    void drainHasABoundedBatchAndCanResumeRemainingTasks() {
        AtomicInteger executions = new AtomicInteger();
        DurableTasks tasks = worker("registration-service", List.of(handler("DELIVER", task -> executions.incrementAndGet())));
        transaction.executeWithoutResult(status -> {
            for (int index = 0; index < 25; index++) tasks.enqueue("DELIVER", "s" + index, null, Map.of("number", index));
        });
        tasks.drain();
        assertThat(executions).hasValue(20);
        tasks.drain();
        assertThat(executions).hasValue(25);
    }

    @Test
    void missingHandlerCorruptPayloadAndDatabaseOutageDoNotLosePendingWorkOrKillPoller() {
        DurableTasks tasks = worker("registration-service", List.of());
        String missing = enqueue(tasks, "UNKNOWN");
        tasks.drain();
        assertThat(state(missing)).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT last_error FROM durable_tasks WHERE id=?", String.class, missing)).isEqualTo("IllegalStateException");
        String corrupt = enqueue(tasks, "DELIVER");
        jdbc.update("UPDATE durable_tasks SET payload='invalid json' WHERE id=?", corrupt);
        tasks.drain();
        assertThat(state(corrupt)).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT last_error FROM durable_tasks WHERE id=?", String.class, corrupt)).isEqualTo("IllegalArgumentException");
        jdbc.execute("DROP TABLE durable_tasks");
        assertThatCode(tasks::drain).doesNotThrowAnyException();
    }

    @Test
    void duplicateHandlerKindIsRejected() {
        var handler = handler("DELIVER", task -> {});
        assertThatThrownBy(() -> worker("registration-service", List.of(handler, handler)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Duplicate task handler");
    }

    @Test
    void interruptedDeliveryPreservesInterruptionAndSchedulesRetry() {
        DurableTasks tasks = worker("registration-service", List.of(handler("DELIVER", task -> { throw new InterruptedException(); })));
        String id = enqueue(tasks, "DELIVER");
        try {
            tasks.drain();
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
            assertThat(state(id)).isEqualTo("PENDING");
        } finally {
            Thread.interrupted();
        }
    }

    private DurableTasks worker(String owner, List<DurableTaskHandler> handlers) {
        return new DurableTasks(jdbc, json, clock, owner, handlers);
    }
    private String enqueue(DurableTasks tasks, String kind) {
        return transaction.execute(status -> tasks.enqueue(kind, "s1", 1L, Map.of("file", "new.pdf")));
    }
    private String state(String id) { return jdbc.queryForObject("SELECT state FROM durable_tasks WHERE id=?", String.class, id); }
    private int attempts(String id) { return jdbc.queryForObject("SELECT attempts FROM durable_tasks WHERE id=?", Integer.class, id); }
    private int count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class); }
    private DurableTaskHandler handler(String kind, Execution body) {
        return new DurableTaskHandler() {
            @Override public String kind() { return kind; }
            @Override public void execute(DurableTask task) throws Exception { body.run(task); }
        };
    }
    private void awaitAndDrain(CyclicBarrier barrier, DurableTasks tasks) {
        try { barrier.await(5, TimeUnit.SECONDS); tasks.drain(); }
        catch (Exception failure) { throw new IllegalStateException(failure); }
    }
    @FunctionalInterface private interface Execution { void run(DurableTask task) throws Exception; }
    public static class BrokenPayload { public String getValue() { throw new IllegalStateException("cannot serialize"); } }
    static class MutableClock extends Clock {
        private Instant instant;
        MutableClock(Instant instant) { this.instant = instant; }
        void advance(long seconds) { instant = instant.plusSeconds(seconds); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return instant; }
    }
}
