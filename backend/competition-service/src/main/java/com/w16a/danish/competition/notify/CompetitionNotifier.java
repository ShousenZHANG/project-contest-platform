package com.w16a.danish.competition.notify;

import com.w16a.danish.competition.domain.mq.JudgeAssignedMessage;
import com.w16a.danish.competition.domain.mq.JudgeRemovedMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import com.w16a.danish.competition.config.CompetitionRabbitMQConfig;

/**
 * This class is responsible for sending messages related to judge assignment/removal events.
 * (Competition-Service → Other Services via MQ)
 *
 * @author Eddy
 * @date 2025/04/19
 */
@Component
@RequiredArgsConstructor
public class CompetitionNotifier {

    private final RabbitTemplate rabbitTemplate;

    /**
     * Send judge assigned message.
     */
    public void sendJudgeAssigned(JudgeAssignedMessage message) {
        rabbitTemplate.convertAndSend(
                CompetitionRabbitMQConfig.COMPETITION_EXCHANGE_NAME,
                CompetitionRabbitMQConfig.JUDGE_ASSIGNED_ROUTING_KEY,
                message,
                msg -> {
                    msg.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                    return msg;
                }
        );
    }

    /**
     * Send judge removed message.
     */
    public void sendJudgeRemoved(JudgeRemovedMessage message) {
        rabbitTemplate.convertAndSend(
                CompetitionRabbitMQConfig.COMPETITION_EXCHANGE_NAME,
                CompetitionRabbitMQConfig.JUDGE_REMOVED_ROUTING_KEY,
                message,
                msg -> {
                    msg.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                    return msg;
                }
        );
    }
}
