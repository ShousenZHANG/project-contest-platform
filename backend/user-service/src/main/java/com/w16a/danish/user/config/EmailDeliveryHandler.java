package com.w16a.danish.user.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.recovery.DurableTask;
import com.w16a.danish.common.recovery.DurableTaskHandler;
import com.w16a.danish.common.messaging.message.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

/** SMTP delivery is recoverable and may repeat after an ambiguous SMTP success. */
@Component
@RequiredArgsConstructor
public class EmailDeliveryHandler implements DurableTaskHandler {
    private final ObjectMapper json;
    private final ObjectProvider<RegistrationEventListener> registrations;
    private final ObjectProvider<CompetitionJudgeEventListener> assignments;
    private final ObjectProvider<AwardWinnerEventListener> awards;
    @Override public String kind() { return "EMAIL"; }
    @Override public void execute(DurableTask task) throws Exception {
        var message = task.payload().path("message");
        switch (task.payload().path("type").asText()) {
            case "RegisterSuccessMessage" -> registrations.getObject().handleRegisterSuccess(json.treeToValue(message, RegisterSuccessMessage.class));
            case "ParticipantRemovedMessage" -> registrations.getObject().handleParticipantRemoved(json.treeToValue(message, ParticipantRemovedMessage.class));
            case "SubmissionUploadedMessage" -> registrations.getObject().handleSubmissionUploaded(json.treeToValue(message, SubmissionUploadedMessage.class));
            case "SubmissionReviewedMessage" -> registrations.getObject().handleSubmissionReviewed(json.treeToValue(message, SubmissionReviewedMessage.class));
            case "JudgeAssignedMessage" -> assignments.getObject().handleJudgeAssigned(json.treeToValue(message, JudgeAssignedMessage.class));
            case "JudgeRemovedMessage" -> assignments.getObject().handleJudgeRemoved(json.treeToValue(message, JudgeRemovedMessage.class));
            case "AwardWinnerMessage" -> awards.getObject().handleAwardWinner(json.treeToValue(message, AwardWinnerMessage.class));
            default -> throw new IllegalArgumentException("Unknown email notification");
        }
    }
}
