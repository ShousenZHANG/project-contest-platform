package com.w16a.danish.common.recovery;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.messaging.NotificationMessageConverter;
import com.w16a.danish.common.messaging.message.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.core.ReturnedMessage;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NotificationOutboxTest {
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    private final RabbitTemplate rabbit = mock(RabbitTemplate.class);
    private final NotificationOutbox outbox = new NotificationOutbox(rabbit, json);

    static Stream<Arguments> notifications() {
        return Stream.of(
                Arguments.of(new JudgeAssignedMessage(), "competition"),
                Arguments.of(new JudgeRemovedMessage(), "competition"),
                Arguments.of(new RegisterSuccessMessage(), "registration"),
                Arguments.of(new ParticipantRemovedMessage(), "registration"),
                Arguments.of(new SubmissionUploadedMessage(), "registration"),
                Arguments.of(new SubmissionReviewedMessage(), "registration"),
                Arguments.of(new AwardWinnerMessage(), "judge"));
    }

    @ParameterizedTest
    @MethodSource("notifications")
    void allSevenContractsPublishPersistentCorrelatedMessagesWithHistoricalTypeIds(Object payload, String producer) throws Exception {
        AtomicReference<Message> sent = new AtomicReference<>();
        var converter = NotificationMessageConverter.create();
        doAnswer(invocation -> {
            assertThat(invocation.<String>getArgument(0)).isEqualTo("notification.exchange");
            assertThat(invocation.<String>getArgument(1)).isEqualTo("notification.key");
            Object decoded = invocation.getArgument(2);
            assertThat(decoded).isEqualTo(payload).isInstanceOf(payload.getClass());
            MessagePostProcessor post = invocation.getArgument(3);
            sent.set(post.postProcessMessage(converter.toMessage(decoded, new MessageProperties())));
            CorrelationData correlation = invocation.getArgument(4);
            assertThat(correlation.getId()).isEqualTo("event-1");
            correlation.getFuture().complete(new CorrelationData.Confirm(true, null));
            return null;
        }).when(rabbit).convertAndSend(anyString(), anyString(), any(), any(MessagePostProcessor.class), any(CorrelationData.class));

        outbox.execute(task(payload));

        assertThat(outbox.kind()).isEqualTo("NOTIFICATION");
        var properties = sent.get().getMessageProperties();
        assertThat(properties.getDeliveryMode()).isEqualTo(MessageDeliveryMode.PERSISTENT);
        assertThat(properties.getMessageId()).isEqualTo("event-1");
        assertThat((String) properties.getHeader("eventId")).isEqualTo("event-1");
        assertThat((String) properties.getHeader("__TypeId__"))
                .isEqualTo("com.w16a.danish." + producer + ".domain.mq." + payload.getClass().getSimpleName());
        assertThat(converter.fromMessage(sent.get())).isEqualTo(payload).isInstanceOf(payload.getClass());
    }

    @Test
    void negativeBrokerConfirmationLeavesDeliveryFailedForRetry() {
        confirmation(false, false, false);
        assertThatThrownBy(() -> outbox.execute(task(new RegisterSuccessMessage())))
                .isInstanceOf(IllegalStateException.class).hasMessage("Notification was not routed and confirmed");
    }

    @Test
    void returnedMessageFailsEvenIfBrokerAcknowledgesPublish() {
        confirmation(true, true, false);
        assertThatThrownBy(() -> outbox.execute(task(new RegisterSuccessMessage())))
                .isInstanceOf(IllegalStateException.class).hasMessage("Notification was not routed and confirmed");
    }

    @Test
    void lostPublisherConnectionIsExposedToDurableRetry() {
        confirmation(true, false, true);
        assertThatThrownBy(() -> outbox.execute(task(new RegisterSuccessMessage())))
                .isInstanceOf(java.util.concurrent.ExecutionException.class);
    }

    @Test
    void unknownPayloadTypesAreRejectedBeforePublish() {
        assertThatThrownBy(() -> NotificationOutbox.payload("exchange", "key", new Object()))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("Unknown notification type");
        DurableTask corrupted = new DurableTask("event-1", "NOTIFICATION", null, null,
                json.valueToTree(Map.of("exchange", "exchange", "routingKey", "key", "type", "UnsupportedMessage", "message", Map.of())));
        assertThatThrownBy(() -> outbox.execute(corrupted)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(rabbit);
    }

    private DurableTask task(Object payload) {
        return new DurableTask("event-1", "NOTIFICATION", null, null,
                json.valueToTree(NotificationOutbox.payload("notification.exchange", "notification.key", payload)));
    }

    private void confirmation(boolean ack, boolean returned, boolean connectionLost) {
        doAnswer(invocation -> {
            CorrelationData correlation = invocation.getArgument(4);
            if (returned) correlation.setReturned(new ReturnedMessage(new Message(new byte[0], new MessageProperties()),
                    312, "NO_ROUTE", "notification.exchange", "notification.key"));
            if (connectionLost) correlation.getFuture().completeExceptionally(new java.io.IOException("publisher unavailable"));
            else correlation.getFuture().complete(new CorrelationData.Confirm(ack, ack ? null : "nack"));
            return null;
        }).when(rabbit).convertAndSend(anyString(), anyString(), any(), any(MessagePostProcessor.class), any(CorrelationData.class));
    }
}
