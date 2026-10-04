package com.w16a.danish.registration.notify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.recovery.DurableTasks;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class UploadRollbackCleanupPersistenceTest {
    private JdbcTemplate jdbc;
    private TransactionTemplate transaction;
    private DurableTasks tasks;
    private UploadRollbackCleanup cleanup;

    @BeforeEach
    void setUp() {
        var dataSource = new DriverManagerDataSource("jdbc:h2:mem:upload_cleanup_" + UUID.randomUUID()
                + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(dataSource);
        var transactions = new DataSourceTransactionManager(dataSource);
        transaction = new TransactionTemplate(transactions);
        tasks = new DurableTasks(jdbc, new ObjectMapper().findAndRegisterModules(), Clock.systemUTC(), "registration-service", List.of());
        cleanup = new UploadRollbackCleanup(tasks, transactions);
        jdbc.execute("""
                CREATE TABLE durable_tasks (
                    id VARCHAR(36) PRIMARY KEY, owner VARCHAR(64) NOT NULL, kind VARCHAR(64) NOT NULL,
                    aggregate_id VARCHAR(128), aggregate_version BIGINT, payload CLOB NOT NULL,
                    state VARCHAR(16) NOT NULL, attempts INT NOT NULL, available_at TIMESTAMP NOT NULL,
                    lease_token VARCHAR(36), lease_until TIMESTAMP, last_error VARCHAR(255), created_at TIMESTAMP NOT NULL
                )
                """);
        jdbc.execute("CREATE TABLE submission_records (id VARCHAR(36) PRIMARY KEY, file_url VARCHAR(255), title VARCHAR(255) CHECK(title <> 'invalid'))");
        jdbc.update("INSERT INTO submission_records VALUES ('s1','old.pdf','Old title')");
    }

    @AfterEach
    void close() { jdbc.execute("SHUTDOWN"); }

    @Test
    void failedDatabaseReplacementQueuesOnlyTheUnreferencedNewFileInANewTransaction() {
        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
            cleanup.watch("new.pdf");
            jdbc.update("UPDATE submission_records SET file_url='new.pdf' WHERE id='s1'");
            tasks.enqueue("SUBMISSION_FILE_DELETE", null, null, Map.of("objectName", "old.pdf"));
            // A real database rejection aborts the domain transaction and its old-file deletion.
            jdbc.update("UPDATE submission_records SET title='invalid' WHERE id='s1'");
        })).isInstanceOf(DataIntegrityViolationException.class);

        assertThat(jdbc.queryForObject("SELECT file_url FROM submission_records WHERE id='s1'", String.class)).isEqualTo("old.pdf");
        assertThat(jdbc.queryForObject("SELECT title FROM submission_records WHERE id='s1'", String.class)).isEqualTo("Old title");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM durable_tasks", Integer.class)).isEqualTo(1);
        var task = jdbc.queryForMap("SELECT * FROM durable_tasks");
        assertThat(task.get("OWNER")).isEqualTo("registration-service");
        assertThat(task.get("KIND")).isEqualTo("SUBMISSION_FILE_DELETE");
        assertThat(task.get("STATE")).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT payload FROM durable_tasks", String.class))
                .contains("new.pdf").doesNotContain("old.pdf");
    }

    @Test
    void successfulReplacementKeepsNewFileAndCommitsOldFileCleanupTogether() {
        transaction.executeWithoutResult(status -> {
            cleanup.watch("new.pdf");
            jdbc.update("UPDATE submission_records SET file_url='new.pdf' WHERE id='s1'");
            tasks.enqueue("SUBMISSION_FILE_DELETE", null, null, Map.of("objectName", "old.pdf"));
        });
        assertThat(jdbc.queryForObject("SELECT file_url FROM submission_records WHERE id='s1'", String.class)).isEqualTo("new.pdf");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM durable_tasks", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT payload FROM durable_tasks", String.class)).contains("old.pdf").doesNotContain("new.pdf");
    }

    @Test
    void rollbackOnlyStatusAlsoPersistsCompensationAfterDomainRollback() {
        transaction.executeWithoutResult(status -> {
            cleanup.watch("new.pdf");
            jdbc.update("UPDATE submission_records SET file_url='new.pdf' WHERE id='s1'");
            status.setRollbackOnly();
        });
        assertThat(jdbc.queryForObject("SELECT file_url FROM submission_records WHERE id='s1'", String.class)).isEqualTo("old.pdf");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM durable_tasks", Integer.class)).isEqualTo(1);
    }

    @Test
    void watchingOutsideATransactionIsRejectedAndDoesNotQueueDeletion() {
        assertThatThrownBy(() -> cleanup.watch("new.pdf")).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM durable_tasks", Integer.class)).isZero();
    }

    @Test
    void databaseOutageDuringCompensationDoesNotReplaceTheOriginalFailure() {
        jdbc.execute("DROP TABLE durable_tasks");
        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
            cleanup.watch("new.pdf");
            throw new IllegalStateException("original domain failure");
        })).isInstanceOf(IllegalStateException.class).hasMessage("original domain failure");
        assertThat(jdbc.queryForObject("SELECT file_url FROM submission_records WHERE id='s1'", String.class)).isEqualTo("old.pdf");
    }
}
