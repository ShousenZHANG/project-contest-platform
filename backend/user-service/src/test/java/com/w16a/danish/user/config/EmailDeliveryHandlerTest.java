package com.w16a.danish.user.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.messaging.message.*;
import com.w16a.danish.common.recovery.DurableTask;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.ObjectProvider;

import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmailDeliveryHandlerTest {
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    private final RegistrationEventListener registrations = mock(RegistrationEventListener.class);
    private final CompetitionJudgeEventListener assignments = mock(CompetitionJudgeEventListener.class);
    private final AwardWinnerEventListener awards = mock(AwardWinnerEventListener.class);
    private final EmailDeliveryHandler handler = new EmailDeliveryHandler(json, provider(registrations), provider(assignments), provider(awards));

    static Stream<Arguments> messages() {
        return Stream.of(Arguments.of(new RegisterSuccessMessage()), Arguments.of(new ParticipantRemovedMessage()),
                Arguments.of(new SubmissionUploadedMessage()), Arguments.of(new SubmissionReviewedMessage()),
                Arguments.of(new JudgeAssignedMessage()), Arguments.of(new JudgeRemovedMessage()), Arguments.of(new AwardWinnerMessage()));
    }

    @ParameterizedTest
    @MethodSource("messages")
    void persistedEmailTaskDecodesToItsExistingTypedHandler(Object payload) throws Exception {
        DurableTask task = new DurableTask("email-1", "EMAIL", "event-1", null,
                json.valueToTree(Map.of("type", payload.getClass().getSimpleName(), "message", payload)));
        handler.execute(task);
        assertThat(handler.kind()).isEqualTo("EMAIL");
        switch (payload) {
            case RegisterSuccessMessage message -> verify(registrations).handleRegisterSuccess(message);
            case ParticipantRemovedMessage message -> verify(registrations).handleParticipantRemoved(message);
            case SubmissionUploadedMessage message -> verify(registrations).handleSubmissionUploaded(message);
            case SubmissionReviewedMessage message -> verify(registrations).handleSubmissionReviewed(message);
            case JudgeAssignedMessage message -> verify(assignments).handleJudgeAssigned(message);
            case JudgeRemovedMessage message -> verify(assignments).handleJudgeRemoved(message);
            case AwardWinnerMessage message -> verify(awards).handleAwardWinner(message);
            default -> throw new AssertionError("unexpected test payload");
        }
    }

    @Test
    void unknownPersistedNotificationFailsForDurableRetry() {
        DurableTask unknown = new DurableTask("email-1", "EMAIL", "event-1", null,
                json.valueToTree(Map.of("type", "Unsupported", "message", Map.of())));
        assertThatThrownBy(() -> handler.execute(unknown)).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Unknown email notification");
        verifyNoInteractions(registrations, assignments, awards);
    }

    @SuppressWarnings("unchecked")
    private <T> ObjectProvider<T> provider(T value) {
        ObjectProvider<T> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(value);
        return provider;
    }
}
