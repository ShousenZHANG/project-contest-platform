package com.w16a.danish.registration.notify;

import com.w16a.danish.common.messaging.MessagingConstants;
import com.w16a.danish.common.messaging.message.SubmissionReviewedMessage;
import com.w16a.danish.common.messaging.message.SubmissionUploadedMessage;
import lombok.RequiredArgsConstructor;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.common.recovery.NotificationOutbox;
import org.springframework.stereotype.Component;

/**
 *
 * This class is responsible for sending messages related to submission events.
 *
 * @author Eddy ZHANG
 * @date 2025/04/13
 */
@Component
@RequiredArgsConstructor
public class SubmissionNotifier {

    private final DurableTasks tasks;

    public void sendSubmissionUploaded(SubmissionUploadedMessage message) {
        tasks.enqueue("NOTIFICATION", null, null, NotificationOutbox.payload(
                MessagingConstants.REGISTRATION_EXCHANGE_NAME, MessagingConstants.SUBMISSION_UPLOADED_ROUTING_KEY, message));
    }

    public void sendSubmissionReviewed(SubmissionReviewedMessage message) {
        tasks.enqueue("NOTIFICATION", null, null, NotificationOutbox.payload(
                MessagingConstants.REGISTRATION_EXCHANGE_NAME, MessagingConstants.SUBMISSION_REVIEWED_ROUTING_KEY, message));
    }

}

