package com.w16a.danish.user.config;

import com.w16a.danish.common.messaging.MessagingConstants;
import com.w16a.danish.common.messaging.NotificationMessageConverter;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ configuration class for defining queues for user-service.
 * Including registration, submission, judge events, and award notifications.
 *
 * @author Eddy
 * @date 2025/04/13
 */
@Configuration
@EnableRabbit
public class RabbitMQConfig {

    // === Queues ===
    @Bean
    public Queue registerSuccessQueue() {
        return QueueBuilder.durable(MessagingConstants.REGISTER_SUCCESS_QUEUE).build();
    }

    @Bean
    public Queue participantRemovedQueue() {
        return QueueBuilder.durable(MessagingConstants.PARTICIPANT_REMOVED_QUEUE).build();
    }

    @Bean
    public Queue submissionUploadedQueue() {
        return QueueBuilder.durable(MessagingConstants.SUBMISSION_UPLOADED_QUEUE).build();
    }

    @Bean
    public Queue submissionReviewedQueue() {
        return QueueBuilder.durable(MessagingConstants.SUBMISSION_REVIEWED_QUEUE).build();
    }

    @Bean
    public Queue judgeAssignedQueue() {
        return QueueBuilder.durable(MessagingConstants.JUDGE_ASSIGNED_QUEUE).build();
    }

    @Bean
    public Queue judgeRemovedQueue() {
        return QueueBuilder.durable(MessagingConstants.JUDGE_REMOVED_QUEUE).build();
    }

    @Bean
    public Queue awardWinnerQueue() {
        return QueueBuilder.durable(MessagingConstants.AWARD_WINNER_QUEUE).build();
    }

    // === Common JSON Converter and RabbitTemplate ===
    @Bean
    public Jackson2JsonMessageConverter jackson2JsonMessageConverter() {
        return NotificationMessageConverter.create();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jackson2JsonMessageConverter());
        return template;
    }
}
