package com.w16a.danish.user.config;

import com.w16a.danish.common.messaging.message.ParticipantRemovedMessage;
import com.w16a.danish.common.messaging.message.RegisterSuccessMessage;
import com.w16a.danish.common.messaging.message.SubmissionReviewedMessage;
import com.w16a.danish.common.messaging.message.SubmissionUploadedMessage;
import com.w16a.danish.common.messaging.MessagingConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;

/**
 *
 * This class listens for registration events and sends email notifications.
 *
 * @author Eddy ZHANG
 * @date 2025/04/13
 */

@Component
@RequiredArgsConstructor
public class RegistrationEventListener {

    private final EmailService emailService;
    private final NotificationInbox inbox;
    private final FrontendProperties frontendProperties;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    @RabbitListener(queues = MessagingConstants.REGISTER_SUCCESS_QUEUE)
    public void receiveRegisterSuccess(RegisterSuccessMessage message,
            @org.springframework.messaging.handler.annotation.Header(name = "eventId", required = false) String eventId) throws Exception {
        inbox.accept("RegisterSuccessMessage", eventId, message);
    }

    public void handleRegisterSuccess(RegisterSuccessMessage message) {
        String subject = "✅ Registration Submitted – " + message.getCompetitionName();

        String competitionUrl = frontendProperties.buildCompetitionPageUrl(message.getUserEmail());

        String content = String.format("""
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
                  <p>Hi <b>%s</b>,</p>

                  <p>Your registration for <b>%s</b> has been <span style="color:green;font-weight:bold;">successfully submitted</span>.</p>

                  <hr>

                  <p><b>👤 Name:</b> %s<br>
                     <b>📅 Time:</b> %s</p>

                  <p>You can view your competitions here:<br>
                  👉 <a href="%s" style="color:#1a73e8;text-decoration:none;">Click to view your competitions</a></p>

                  <hr>

                  <p style="font-size:12px;color:gray;">
                    This is an automated message from the <b>Danish Competition Platform</b>.
                  </p>
                </div>
                """,
                message.getUserName(),
                message.getCompetitionName(),
                message.getUserName(),
                message.getRegisterTime().format(FORMATTER),
                competitionUrl
        );

        emailService.send(message.getUserEmail(), subject, content);
    }

    @RabbitListener(queues = MessagingConstants.PARTICIPANT_REMOVED_QUEUE)
    public void receiveParticipantRemoved(ParticipantRemovedMessage message,
            @org.springframework.messaging.handler.annotation.Header(name = "eventId", required = false) String eventId) throws Exception {
        inbox.accept("ParticipantRemovedMessage", eventId, message);
    }

    public void handleParticipantRemoved(ParticipantRemovedMessage message) {
        String subject = "❌ Registration Cancelled – " + message.getCompetitionName();

        String content = String.format("""
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
                  <p>Hi <b>%s</b>,</p>

                  <p>Your registration for <b>%s</b> has been <span style="color:red;font-weight:bold;">cancelled</span> by <b>%s</b>.</p>

                  <hr>

                  <p><b>❌ Cancelled at:</b> %s</p>

                  <p>If this was unexpected, please contact the competition organizer.</p>

                  <hr>

                  <p style="font-size:12px;color:gray;">
                    This is an automated message from the <b>Danish Competition Platform</b>.
                  </p>
                </div>
                """,
                message.getUserName(),
                message.getCompetitionName(),
                message.getRemovedBy(),
                message.getRemovedAt().format(FORMATTER)
        );

        emailService.send(message.getUserEmail(), subject, content);
    }

    @RabbitListener(queues = MessagingConstants.SUBMISSION_UPLOADED_QUEUE)
    public void receiveSubmissionUploaded(SubmissionUploadedMessage message,
            @org.springframework.messaging.handler.annotation.Header(name = "eventId", required = false) String eventId) throws Exception {
        inbox.accept("SubmissionUploadedMessage", eventId, message);
    }

    public void handleSubmissionUploaded(SubmissionUploadedMessage message) {
        String subject = "📤 Submission Uploaded – " + message.getCompetitionName();
        String competitionUrl = frontendProperties.buildCompetitionPageUrl(message.getUserEmail());

        String content = String.format("""
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
                  <p>Hi <b>%s</b>,</p>

                  <p>Your submission titled <b>%s</b> for <b>%s</b> has been <span style="color:green;font-weight:bold;">successfully uploaded</span>.</p>

                  <hr>

                  <p><b>📅 Submitted at:</b> %s</p>

                  <p>You can view your competitions here:<br>
                  👉 <a href="%s" style="color:#1a73e8;text-decoration:none;">Click to view your competitions</a></p>

                  <hr>

                  <p style="font-size:12px;color:gray;">
                    This is an automated message from the <b>Danish Competition Platform</b>.
                  </p>
                </div>
                """,
                message.getUserName(),
                message.getTitle(),
                message.getCompetitionName(),
                message.getSubmittedAt().format(FORMATTER),
                competitionUrl
        );

        emailService.send(message.getUserEmail(), subject, content);
    }

    @RabbitListener(queues = MessagingConstants.SUBMISSION_REVIEWED_QUEUE)
    public void receiveSubmissionReviewed(SubmissionReviewedMessage message,
            @org.springframework.messaging.handler.annotation.Header(name = "eventId", required = false) String eventId) throws Exception {
        inbox.accept("SubmissionReviewedMessage", eventId, message);
    }

    public void handleSubmissionReviewed(SubmissionReviewedMessage message) {
        String subject = "📋 Submission Reviewed – " + message.getCompetitionName();
        String competitionUrl = frontendProperties.buildCompetitionPageUrl(message.getUserEmail());

        String content = String.format("""
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
                  <p>Hi <b>%s</b>,</p>

                  <p>Your submission titled <b>%s</b> for <b>%s</b> has been reviewed.</p>

                  <p><b>Status:</b> <span style="font-weight:bold;color:%s;">%s</span></p>

                  <p><b>📋 Review Comments:</b> %s</p>

                  <hr>

                  <p><b>📅 Reviewed at:</b> %s</p>

                  <p>You can view your competitions here:<br>
                  👉 <a href="%s" style="color:#1a73e8;text-decoration:none;">Click to view your competitions</a></p>

                  <hr>

                  <p style="font-size:12px;color:gray;">
                    This is an automated message from the <b>Danish Competition Platform</b>.
                  </p>
                </div>
                """,
                message.getUserName(),
                message.getTitle(),
                message.getCompetitionName(),
                "APPROVED".equalsIgnoreCase(message.getReviewStatus()) ? "green" : "red",
                message.getReviewStatus(),
                message.getReviewComments(),
                message.getReviewedAt().format(FORMATTER),
                competitionUrl
        );

        emailService.send(message.getUserEmail(), subject, content);
    }
}
