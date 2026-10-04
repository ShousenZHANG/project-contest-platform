package com.w16a.danish.user.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.recovery.DurableTasks;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;

/** A broker ack follows this transaction, not SMTP. Duplicate deliveries share one email task. */
@Service
@RequiredArgsConstructor
public class NotificationInbox {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final DurableTasks tasks;

    @Transactional
    public void accept(String type, String eventId, Object message) throws Exception {
        String id = eventId;
        if (id == null || id.isBlank()) {
            id = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(
                    (type + json.writeValueAsString(message)).getBytes(StandardCharsets.UTF_8)));
        }
        if (id.length() > 128) throw new IllegalArgumentException("Invalid notification ID");
        try { jdbc.update("INSERT INTO notification_inbox (event_id,received_at) VALUES (?,?)", id, Timestamp.from(Instant.now())); }
        catch (DuplicateKeyException duplicate) { return; }
        tasks.enqueue("EMAIL", id, null, Map.of("type", type, "message", message));
    }
}
