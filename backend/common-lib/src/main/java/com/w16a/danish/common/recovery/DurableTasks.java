package com.w16a.danish.common.recovery;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.*;

/** Business writes and outgoing tasks commit together; a restart never loses pending work. */
@Slf4j
public class DurableTasks {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final Clock clock;
    private final String owner;
    private final Map<String, DurableTaskHandler> handlers;

    public DurableTasks(JdbcTemplate jdbc, ObjectMapper json, Clock clock, String owner, List<DurableTaskHandler> handlers) {
        this.jdbc = jdbc; this.json = json; this.clock = clock; this.owner = owner;
        Map<String, DurableTaskHandler> byKind = new HashMap<>();
        for (var handler : handlers) {
            if (byKind.put(handler.kind(), handler) != null) throw new IllegalArgumentException("Duplicate task handler: " + handler.kind());
        }
        this.handlers = Map.copyOf(byKind);
    }

    public String enqueue(String kind, String aggregateId, Long version, Object payload) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("A durable task must join a domain transaction");
        }
        try {
            String id = UUID.randomUUID().toString();
            jdbc.update("INSERT INTO durable_tasks (id,owner,kind,aggregate_id,aggregate_version,payload,state,attempts,available_at,created_at) VALUES (?,?,?,?,?,?,'PENDING',0,?,?)",
                    id, owner, kind, aggregateId, version, json.writeValueAsString(payload), now(), now());
            return id;
        } catch (com.fasterxml.jackson.core.JsonProcessingException invalid) {
            throw new IllegalArgumentException("Task payload cannot be serialized", invalid);
        }
    }

    @Scheduled(fixedDelayString = "${platform.tasks.poll-ms:2000}", initialDelayString = "${platform.tasks.initial-delay-ms:30000}")
    public void drain() {
        try {
            for (int processed = 0; processed < 20; processed++) {
                var ids = jdbc.queryForList("SELECT id FROM durable_tasks WHERE owner=? AND state IN ('PENDING','PROCESSING') AND available_at<=? AND (lease_until IS NULL OR lease_until<=?) ORDER BY created_at,id LIMIT 1",
                        String.class, owner, now(), now());
                if (ids.isEmpty()) return;
                run(ids.getFirst());
            }
        } catch (Exception databaseUnavailable) {
            // Scheduler survives a database outage; task state is kept in the database.
            log.error("Cannot poll durable tasks for {}: {}", owner, databaseUnavailable.getClass().getSimpleName());
        }
    }

    private void run(String id) {
        String lease = UUID.randomUUID().toString();
        if (jdbc.update("UPDATE durable_tasks SET state='PROCESSING',lease_token=?,lease_until=?,attempts=attempts+1 WHERE id=? AND owner=? AND state IN ('PENDING','PROCESSING') AND available_at<=? AND (lease_until IS NULL OR lease_until<=?)",
                lease, Timestamp.from(clock.instant().plusSeconds(120)), id, owner, now(), now()) != 1) return;
        try {
            DurableTask task = jdbc.queryForObject("SELECT id,kind,aggregate_id,aggregate_version,payload FROM durable_tasks WHERE id=? AND lease_token=?",
                    (rs, row) -> new DurableTask(rs.getString("id"), rs.getString("kind"), rs.getString("aggregate_id"),
                            rs.getObject("aggregate_version", Long.class), decode(rs.getString("payload"))), id, lease);
            DurableTaskHandler handler = handlers.get(Objects.requireNonNull(task).kind());
            if (handler == null) throw new IllegalStateException("No handler for " + task.kind());
            handler.execute(task);
            jdbc.update("UPDATE durable_tasks SET state='DONE',lease_token=NULL,lease_until=NULL,last_error=NULL WHERE id=? AND lease_token=?", id, lease);
        } catch (Exception failure) {
            if (failure instanceof InterruptedException) Thread.currentThread().interrupt();
            Integer attempts = jdbc.queryForObject("SELECT attempts FROM durable_tasks WHERE id=?", Integer.class, id);
            int tries = Objects.requireNonNull(attempts);
            String state = tries >= 8 ? "DEAD" : "PENDING";
            long delay = Math.min(3600, 5L << Math.min(tries, 9));
            // Do not persist exception messages: network exceptions can contain service secrets.
            jdbc.update("UPDATE durable_tasks SET state=?,available_at=?,lease_token=NULL,lease_until=NULL,last_error=? WHERE id=? AND lease_token=?",
                    state, Timestamp.from(clock.instant().plusSeconds(delay)), failure.getClass().getSimpleName(), id, lease);
            log.warn("Durable task {} kind failed (attempt {}): {}", id, tries, failure.getClass().getSimpleName());
        }
    }

    private Timestamp now() { return Timestamp.from(clock.instant()); }

    private com.fasterxml.jackson.databind.JsonNode decode(String payload) {
        try { return json.readTree(payload); }
        catch (com.fasterxml.jackson.core.JsonProcessingException invalid) { throw new IllegalArgumentException("Invalid persisted task payload", invalid); }
    }
}
