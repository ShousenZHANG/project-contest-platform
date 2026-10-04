package com.w16a.danish.registration.config;

import com.w16a.danish.common.messaging.MessagingConstants;
import com.w16a.danish.common.messaging.NotificationMessageConverter;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 *
 * This class configures RabbitMQ for the registration service.
 *
 * @author Eddy ZHANG
 * @date 2025/04/13
 */
@Configuration
public class RabbitMQConfig {

    // Exchange
    @Bean
    public TopicExchange registrationExchange() {
        return ExchangeBuilder.topicExchange(MessagingConstants.REGISTRATION_EXCHANGE_NAME).durable(true).build();
    }

    // Queues
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

    // Bindings
    @Bean
    public Binding registerSuccessBinding() {
        return BindingBuilder.bind(registerSuccessQueue())
                .to(registrationExchange()).with(MessagingConstants.REGISTER_SUCCESS_ROUTING_KEY);
    }

    @Bean
    public Binding participantRemovedBinding() {
        return BindingBuilder.bind(participantRemovedQueue())
                .to(registrationExchange()).with(MessagingConstants.PARTICIPANT_REMOVED_ROUTING_KEY);
    }

    @Bean
    public Binding submissionUploadedBinding() {
        return BindingBuilder.bind(submissionUploadedQueue())
                .to(registrationExchange()).with(MessagingConstants.SUBMISSION_UPLOADED_ROUTING_KEY);
    }

    @Bean
    public Binding submissionReviewedBinding() {
        return BindingBuilder.bind(submissionReviewedQueue())
                .to(registrationExchange()).with(MessagingConstants.SUBMISSION_REVIEWED_ROUTING_KEY);
    }

    // JSON message converter
    @Bean
    public Jackson2JsonMessageConverter jackson2JsonMessageConverter() {
        return NotificationMessageConverter.create();
    }

    // RabbitTemplate with JSON converter
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jackson2JsonMessageConverter());
        return template;
    }
}
