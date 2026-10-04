package com.w16a.danish.competition.config;

import com.w16a.danish.common.messaging.MessagingConstants;
import com.w16a.danish.common.messaging.NotificationMessageConverter;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for RabbitMQ queues, exchanges, and bindings for competition-service.
 * (Judges assignment, removal, etc.)
 *
 * @author Eddy
 * @date 2025/04/19
 */
@Configuration
public class CompetitionRabbitMQConfig {

    // Exchange
    @Bean
    public TopicExchange competitionExchange() {
        return ExchangeBuilder.topicExchange(MessagingConstants.COMPETITION_EXCHANGE_NAME).durable(true).build();
    }

    // Queues
    @Bean
    public Queue judgeAssignedQueue() {
        return QueueBuilder.durable(MessagingConstants.JUDGE_ASSIGNED_QUEUE).build();
    }

    @Bean
    public Queue judgeRemovedQueue() {
        return QueueBuilder.durable(MessagingConstants.JUDGE_REMOVED_QUEUE).build();
    }

    // Bindings
    @Bean
    public Binding judgeAssignedBinding() {
        return BindingBuilder.bind(judgeAssignedQueue())
                .to(competitionExchange())
                .with(MessagingConstants.JUDGE_ASSIGNED_ROUTING_KEY);
    }

    @Bean
    public Binding judgeRemovedBinding() {
        return BindingBuilder.bind(judgeRemovedQueue())
                .to(competitionExchange())
                .with(MessagingConstants.JUDGE_REMOVED_ROUTING_KEY);
    }

    // Message Converter
    @Bean
    public Jackson2JsonMessageConverter jackson2JsonMessageConverter() {
        return NotificationMessageConverter.create();
    }

    // RabbitTemplate
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jackson2JsonMessageConverter());
        return template;
    }
}
