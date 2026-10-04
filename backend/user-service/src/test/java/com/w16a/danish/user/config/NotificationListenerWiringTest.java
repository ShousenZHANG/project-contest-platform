package com.w16a.danish.user.config;

import com.w16a.danish.common.messaging.MessagingConstants;
import com.w16a.danish.common.messaging.NotificationMessageConverter;
import com.w16a.danish.common.messaging.message.RegisterSuccessMessage;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.listener.RabbitListenerEndpointRegistry;
import org.springframework.amqp.rabbit.listener.SimpleMessageListenerContainer;
import org.springframework.amqp.rabbit.listener.api.ChannelAwareMessageListener;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.time.LocalDateTime;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class NotificationListenerWiringTest {

    @Test
    void theSingleJsonConverterDeliversHistoricalProducerMessagesToAnActualListener() {
        ConnectionFactory connectionFactory = mock(ConnectionFactory.class);
        EmailService emailService = mock(EmailService.class);
        FrontendProperties frontendProperties = new FrontendProperties();
        frontendProperties.setBaseUrl("https://example.com");

        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(RabbitAutoConfiguration.class))
                .withUserConfiguration(RabbitMQConfig.class)
                .withBean(ConnectionFactory.class, () -> connectionFactory)
                .withBean(EmailService.class, () -> emailService)
                .withBean(FrontendProperties.class, () -> frontendProperties)
                .withBean(RegistrationEventListener.class)
                .withPropertyValues("spring.rabbitmq.listener.simple.auto-startup=false", "spring.rabbitmq.dynamic=false")
                .run(context -> {
                    assertThat(context).hasNotFailed().hasSingleBean(Jackson2JsonMessageConverter.class);
                    assertThat(context.getBean(RabbitTemplate.class).getMessageConverter())
                            .isSameAs(context.getBean(Jackson2JsonMessageConverter.class));

                    RabbitListenerEndpointRegistry registry = context.getBean(RabbitListenerEndpointRegistry.class);
                    SimpleMessageListenerContainer registrationContainer = registry.getListenerContainers().stream()
                            .map(SimpleMessageListenerContainer.class::cast)
                            .filter(container -> Arrays.asList(container.getQueueNames()).contains(MessagingConstants.REGISTER_SUCCESS_QUEUE))
                            .findFirst().orElseThrow();

                    RegisterSuccessMessage registration = new RegisterSuccessMessage();
                    registration.setUserName("Participant");
                    registration.setUserEmail("participant@example.com");
                    registration.setCompetitionName("Innovation");
                    registration.setRegisterTime(LocalDateTime.of(2026, 10, 4, 14, 30));
                    Message message = NotificationMessageConverter.create().toMessage(registration, new MessageProperties());
                    ((ChannelAwareMessageListener) registrationContainer.getMessageListener()).onMessage(message, null);

                    verify(emailService).send(eq("participant@example.com"), contains("Innovation"), contains("2026-10-04 14:30"));
                    verify(connectionFactory, never()).createConnection();
                });
    }
}
