package com.w16a.danish.common.recovery;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.messaging.message.*;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/** Keeps the seven historical message contracts; task IDs also identify redeliveries. */
public class NotificationOutbox implements DurableTaskHandler {
    private static final Map<String, Class<?>> TYPES = Map.of(
            "JudgeAssignedMessage", JudgeAssignedMessage.class, "JudgeRemovedMessage", JudgeRemovedMessage.class,
            "RegisterSuccessMessage", RegisterSuccessMessage.class, "ParticipantRemovedMessage", ParticipantRemovedMessage.class,
            "SubmissionUploadedMessage", SubmissionUploadedMessage.class, "SubmissionReviewedMessage", SubmissionReviewedMessage.class,
            "AwardWinnerMessage", AwardWinnerMessage.class);
    private final RabbitTemplate rabbit;
    private final ObjectMapper json;
    public NotificationOutbox(RabbitTemplate rabbit, ObjectMapper json) { this.rabbit = rabbit; this.json = json; }

    public static Map<String,Object> payload(String exchange, String routingKey, Object message) {
        if (!TYPES.containsKey(message.getClass().getSimpleName())) throw new IllegalArgumentException("Unknown notification type");
        return Map.of("exchange", exchange, "routingKey", routingKey, "type", message.getClass().getSimpleName(), "message", message);
    }
    @Override public String kind() { return "NOTIFICATION"; }
    @Override public void execute(DurableTask task) throws Exception {
        var p = task.payload();
        Class<?> type = TYPES.get(p.path("type").asText());
        if (type == null) throw new IllegalArgumentException("Unknown notification type");
        Object message = json.treeToValue(p.path("message"), type);
        CorrelationData correlation = new CorrelationData(task.id());
        rabbit.convertAndSend(p.path("exchange").asText(), p.path("routingKey").asText(), message, msg -> {
            msg.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
            msg.getMessageProperties().setMessageId(task.id());
            msg.getMessageProperties().setHeader("eventId", task.id());
            return msg;
        }, correlation);
        if (!correlation.getFuture().get(15, TimeUnit.SECONDS).isAck() || correlation.getReturned() != null) {
            throw new IllegalStateException("Notification was not routed and confirmed");
        }
    }
}
