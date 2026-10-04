package com.w16a.danish.registration.notify;

import com.w16a.danish.common.messaging.MessagingConstants;
import com.w16a.danish.common.messaging.message.RegisterSuccessMessage;
import com.w16a.danish.common.messaging.message.ParticipantRemovedMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
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

    private final RabbitTemplate rabbitTemplate;

    public void sendRegisterSuccess(RegisterSuccessMessage message) {
        rabbitTemplate.convertAndSend(
                MessagingConstants.REGISTRATION_EXCHANGE_NAME,
                MessagingConstants.REGISTER_SUCCESS_ROUTING_KEY,
                message,
                msg -> {
                    msg.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                    return msg;
                }
        );
    }

    public void sendParticipantRemoved(ParticipantRemovedMessage message) {
        rabbitTemplate.convertAndSend(
                MessagingConstants.REGISTRATION_EXCHANGE_NAME,
                MessagingConstants.PARTICIPANT_REMOVED_ROUTING_KEY,
                message,
                msg -> {
                    msg.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                    return msg;
                }
        );
    }
}
