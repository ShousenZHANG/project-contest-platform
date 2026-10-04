package com.w16a.danish.user.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.messaging.message.RegisterSuccessMessage;
import com.w16a.danish.common.recovery.DurableTasks;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import java.time.Clock;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class NotificationInboxPersistenceTest {
    private AnnotationConfigApplicationContext context;
    private JdbcTemplate jdbc;
    private NotificationInbox inbox;

    @Configuration
    @EnableTransactionManagement
    static class Database {
        @Bean DataSource dataSource() {
            return new DriverManagerDataSource("jdbc:h2:mem:inbox_" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        }
        @Bean DataSourceTransactionManager transactionManager(DataSource source) { return new DataSourceTransactionManager(source); }
        @Bean JdbcTemplate jdbc(DataSource source) { return new JdbcTemplate(source); }
        @Bean ObjectMapper json() { return new ObjectMapper().findAndRegisterModules(); }
        @Bean DurableTasks tasks(JdbcTemplate jdbc, ObjectMapper json) {
            return new DurableTasks(jdbc, json, Clock.systemUTC(), "user-service", List.of());
        }
        @Bean NotificationInbox inbox(JdbcTemplate jdbc, ObjectMapper json, DurableTasks tasks) {
            return new NotificationInbox(jdbc, json, tasks);
        }
    }

    @BeforeEach
    void start() {
        context = new AnnotationConfigApplicationContext(Database.class);
        jdbc = context.getBean(JdbcTemplate.class);
        jdbc.execute("CREATE TABLE notification_inbox (event_id VARCHAR(128) PRIMARY KEY, received_at TIMESTAMP NOT NULL)");
        jdbc.execute("""
                CREATE TABLE durable_tasks (
                    id VARCHAR(36) PRIMARY KEY, owner VARCHAR(64) NOT NULL, kind VARCHAR(64) NOT NULL,
                    aggregate_id VARCHAR(128), aggregate_version BIGINT, payload CLOB NOT NULL,
                    state VARCHAR(16) NOT NULL, attempts INT NOT NULL, available_at TIMESTAMP NOT NULL,
                    lease_token VARCHAR(36), lease_until TIMESTAMP, last_error VARCHAR(255), created_at TIMESTAMP NOT NULL
                )
                """);
        inbox = context.getBean(NotificationInbox.class);
    }

    @AfterEach
    void close() {
        jdbc.execute("SHUTDOWN");
        context.close();
    }

    @Test
    void repeatedBrokerEventCreatesOnePersistedEmailTask() throws Exception {
        RegisterSuccessMessage payload = registration("Participant");
        inbox.accept("RegisterSuccessMessage", "event-1", payload);
        inbox.accept("RegisterSuccessMessage", "event-1", payload);
        assertThat(count("notification_inbox")).isEqualTo(1);
        assertThat(count("durable_tasks")).isEqualTo(1);
        var task = jdbc.queryForMap("SELECT * FROM durable_tasks");
        assertThat(task).containsEntry("OWNER", "user-service").containsEntry("KIND", "EMAIL")
                .containsEntry("AGGREGATE_ID", "event-1").containsEntry("STATE", "PENDING");
        assertThat(jdbc.queryForObject("SELECT payload FROM durable_tasks", String.class)).contains("RegisterSuccessMessage", "Participant");
    }

    @Test
    void legacyMissingAndBlankEventIdsDeduplicateByPayload() throws Exception {
        RegisterSuccessMessage payload = registration("Participant");
        inbox.accept("RegisterSuccessMessage", null, payload);
        inbox.accept("RegisterSuccessMessage", " ", payload);
        assertThat(count("durable_tasks")).isEqualTo(1);
        String id = jdbc.queryForObject("SELECT event_id FROM notification_inbox", String.class);
        assertThat(id).matches("[0-9a-f]{64}");
        inbox.accept("RegisterSuccessMessage", null, registration("Other Participant"));
        assertThat(count("durable_tasks")).isEqualTo(2);
    }

    @Test
    void failedEmailEnqueueRollsBackInboxReceiptSoBrokerRetryCanRecover() throws Exception {
        assertThatThrownBy(() -> inbox.accept("RegisterSuccessMessage", "event-1", new BrokenPayload()))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("Task payload cannot be serialized");
        assertThat(count("notification_inbox")).isZero();
        assertThat(count("durable_tasks")).isZero();
        inbox.accept("RegisterSuccessMessage", "event-1", registration("Participant"));
        assertThat(count("notification_inbox")).isEqualTo(1);
        assertThat(count("durable_tasks")).isEqualTo(1);
    }

    @Test
    void oversizedEventIdDoesNotCreateReceiptOrTask() {
        assertThatThrownBy(() -> inbox.accept("RegisterSuccessMessage", "x".repeat(129), registration("Participant")))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("Invalid notification ID");
        assertThat(count("notification_inbox")).isZero();
        assertThat(count("durable_tasks")).isZero();
    }

    private int count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class); }
    private RegisterSuccessMessage registration(String name) {
        RegisterSuccessMessage payload = new RegisterSuccessMessage();
        payload.setUserName(name);
        payload.setUserEmail("participant@example.com");
        payload.setCompetitionName("Innovation");
        return payload;
    }
    public static class BrokenPayload { public String getValue() { throw new IllegalStateException("cannot serialize"); } }
}
