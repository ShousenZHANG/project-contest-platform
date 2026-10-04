package com.w16a.danish.registration.notify;

import com.w16a.danish.common.messaging.MessagingConstants;
import com.w16a.danish.common.messaging.message.RegisterSuccessMessage;
import com.w16a.danish.common.messaging.message.ParticipantRemovedMessage;
import lombok.RequiredArgsConstructor;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.common.recovery.NotificationOutbox;
import org.springframework.stereotype.Component;

/**
 *
 * This class is responsible for sending messages related to registration events.
 *
 * @author Eddy ZHANG
 * @date 2025/04/13
 */
@Component
@RequiredArgsConstructor
public class RegistrationNotifier {

    private final DurableTasks tasks;

    public void sendRegisterSuccess(RegisterSuccessMessage message) {
        tasks.enqueue("NOTIFICATION", null, null, NotificationOutbox.payload(
                MessagingConstants.REGISTRATION_EXCHANGE_NAME, MessagingConstants.REGISTER_SUCCESS_ROUTING_KEY, message));
    }

    public void sendParticipantRemoved(ParticipantRemovedMessage message) {
        tasks.enqueue("NOTIFICATION", null, null, NotificationOutbox.payload(
                MessagingConstants.REGISTRATION_EXCHANGE_NAME, MessagingConstants.PARTICIPANT_REMOVED_ROUTING_KEY, message));
    }
}
