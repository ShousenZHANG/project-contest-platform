package com.w16a.danish.user.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.messaging.message.*;
import com.w16a.danish.common.recovery.DurableTask;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.beans.factory.ObjectProvider;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Uses existing rendering handlers while replacing only the SMTP transport. */
class EmailDeliveryRenderingTest {
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    private final EmailService smtp = mock(EmailService.class);
    private final NotificationInbox inbox = mock(NotificationInbox.class);
    private final FrontendProperties frontend = frontend();
    private final EmailDeliveryHandler delivery = new EmailDeliveryHandler(json,
            provider(new RegistrationEventListener(smtp, inbox, frontend)),
            provider(new CompetitionJudgeEventListener(smtp, inbox, frontend)),
            provider(new AwardWinnerEventListener(smtp, inbox, frontend)));

    static Stream<Object> messages() {
        return Stream.of(new RegisterSuccessMessage(), new ParticipantRemovedMessage(),
                new SubmissionUploadedMessage(), new SubmissionReviewedMessage(), new JudgeAssignedMessage(),
                new JudgeRemovedMessage(), new AwardWinnerMessage()).map(EmailDeliveryRenderingTest::populated);
    }

    @ParameterizedTest
    @MethodSource("messages")
    void recoveredTaskStillRendersTheExistingMessageAndRecipient(Object payload) throws Exception {
        delivery.execute(task(payload));
        verify(smtp).send(eq("recipient@example.com"), contains("Innovation"), contains("2026-10-04 14:30"));
        verifyNoInteractions(inbox);
    }

    @Test
    void reviewedRejectedSubmissionRendersRejectedStatus() throws Exception {
        SubmissionReviewedMessage review = (SubmissionReviewedMessage) populated(new SubmissionReviewedMessage());
        review.setReviewStatus("REJECTED");
        delivery.execute(task(review));
        verify(smtp).send(eq("recipient@example.com"), contains("Innovation"), contains("REJECTED"));
    }

    @Test
    void noAwardAndAbsentAwardRetainParticipationMessage() throws Exception {
        AwardWinnerMessage award = (AwardWinnerMessage) populated(new AwardWinnerMessage());
        award.setAwardName("None");
        delivery.execute(task(award));
        award.setAwardName(null);
        delivery.execute(task(award));
        verify(smtp, times(2)).send(eq("recipient@example.com"), contains("Thank You"), contains("didn't win"));
    }

    @Test
    void smtpFailureEscapesTheHandlerForDurableRetry() {
        doThrow(new IllegalStateException("SMTP unavailable")).when(smtp).send(anyString(), anyString(), anyString());
        assertThatThrownBy(() -> delivery.execute(task(populated(new RegisterSuccessMessage()))))
                .isInstanceOf(IllegalStateException.class).hasMessage("SMTP unavailable");
    }

    private DurableTask task(Object payload) {
        return new DurableTask("email-1", "EMAIL", "event-1", null,
                json.valueToTree(Map.of("type", payload.getClass().getSimpleName(), "message", payload)));
    }

    private static Object populated(Object payload) {
        BeanWrapperImpl fields = new BeanWrapperImpl(payload);
        for (String field : new String[]{"userName", "judgeName"}) if (fields.isWritableProperty(field)) fields.setPropertyValue(field, "Recipient");
        for (String field : new String[]{"userEmail", "judgeEmail"}) if (fields.isWritableProperty(field)) fields.setPropertyValue(field, "recipient@example.com");
        for (String field : new String[]{"assignedAt", "removedAt", "registerTime", "submittedAt", "reviewedAt", "awardedAt"})
            if (fields.isWritableProperty(field)) fields.setPropertyValue(field, LocalDateTime.of(2026, 10, 4, 14, 30));
        fields.setPropertyValue("competitionName", "Innovation");
        if (fields.isWritableProperty("awardName")) fields.setPropertyValue("awardName", "Gold");
        if (fields.isWritableProperty("reviewStatus")) fields.setPropertyValue("reviewStatus", "APPROVED");
        if (fields.isWritableProperty("title")) fields.setPropertyValue("title", "Project");
        if (fields.isWritableProperty("removedBy")) fields.setPropertyValue("removedBy", "Organizer");
        return payload;
    }
    private static FrontendProperties frontend() {
        FrontendProperties properties = new FrontendProperties();
        properties.setBaseUrl("https://example.com");
        return properties;
    }
    @SuppressWarnings("unchecked")
    private <T> ObjectProvider<T> provider(T value) {
        ObjectProvider<T> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(value);
        return provider;
    }
}
