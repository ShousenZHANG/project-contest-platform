package com.w16a.danish.user.config;

import com.w16a.danish.common.messaging.MessagingConstants;
import com.w16a.danish.common.messaging.NotificationMessageConverter;
import com.w16a.danish.common.messaging.message.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.listener.RabbitListenerEndpointRegistry;
import org.springframework.amqp.rabbit.listener.SimpleMessageListenerContainer;
import org.springframework.amqp.rabbit.listener.api.ChannelAwareMessageListener;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.amqp.autoconfigure.RabbitAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verifyNoInteractions;

class NotificationListenerWiringTest {

    static Stream<Arguments> notifications() {
        RegisterSuccessMessage registration = new RegisterSuccessMessage();
        registration.setUserName("Participant");
        registration.setUserEmail("participant@example.com");
        registration.setCompetitionName("Innovation");
        registration.setRegisterTime(LocalDateTime.of(2026, 10, 4, 14, 30));
        return Stream.of(
                Arguments.of(registration, MessagingConstants.REGISTER_SUCCESS_QUEUE, "event-1"),
                Arguments.of(new ParticipantRemovedMessage(), MessagingConstants.PARTICIPANT_REMOVED_QUEUE, "event-1"),
                Arguments.of(new SubmissionUploadedMessage(), MessagingConstants.SUBMISSION_UPLOADED_QUEUE, "event-1"),
                Arguments.of(new SubmissionReviewedMessage(), MessagingConstants.SUBMISSION_REVIEWED_QUEUE, "event-1"),
                Arguments.of(new JudgeAssignedMessage(), MessagingConstants.JUDGE_ASSIGNED_QUEUE, "event-1"),
                Arguments.of(new JudgeRemovedMessage(), MessagingConstants.JUDGE_REMOVED_QUEUE, "event-1"),
                Arguments.of(new AwardWinnerMessage(), MessagingConstants.AWARD_WINNER_QUEUE, "event-1"),
                Arguments.of(registration, MessagingConstants.REGISTER_SUCCESS_QUEUE, null));
    }

    @ParameterizedTest
    @MethodSource("notifications")
    void theSingleJsonConverterQueuesHistoricalProducerMessagesThroughAnActualListener(Object payload, String queue, String eventId) {
        ConnectionFactory connectionFactory = mock(ConnectionFactory.class);
        EmailService emailService = mock(EmailService.class);
        NotificationInbox inbox = mock(NotificationInbox.class);
        FrontendProperties frontendProperties = new FrontendProperties();
        frontendProperties.setBaseUrl("https://example.com");

        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(RabbitAutoConfiguration.class))
                .withUserConfiguration(RabbitMQConfig.class)
                .withBean(ConnectionFactory.class, () -> connectionFactory)
                .withBean(EmailService.class, () -> emailService)
                .withBean(NotificationInbox.class, () -> inbox)
                .withBean(FrontendProperties.class, () -> frontendProperties)
                .withBean(RegistrationEventListener.class)
                .withBean(CompetitionJudgeEventListener.class)
                .withBean(AwardWinnerEventListener.class)
                .withPropertyValues("spring.rabbitmq.listener.simple.auto-startup=false", "spring.rabbitmq.dynamic=false")
                .run(context -> {
                    assertThat(context).hasNotFailed().hasSingleBean(Jackson2JsonMessageConverter.class);
                    assertThat(context.getBean(RabbitTemplate.class).getMessageConverter())
                            .isSameAs(context.getBean(Jackson2JsonMessageConverter.class));

                    RabbitListenerEndpointRegistry registry = context.getBean(RabbitListenerEndpointRegistry.class);
                    SimpleMessageListenerContainer registrationContainer = registry.getListenerContainers().stream()
                            .map(SimpleMessageListenerContainer.class::cast)
                            .filter(container -> Arrays.asList(container.getQueueNames()).contains(queue))
                            .findFirst().orElseThrow();

                    Message message = NotificationMessageConverter.create().toMessage(payload, new MessageProperties());
                    if (eventId != null) message.getMessageProperties().setHeader("eventId", eventId);
                    ((ChannelAwareMessageListener) registrationContainer.getMessageListener()).onMessage(message, null);

                    verify(inbox).accept(eq(payload.getClass().getSimpleName()), eq(eventId), argThat(decoded -> payload.equals(decoded)));
                    verifyNoInteractions(emailService);
                    verify(connectionFactory, never()).createConnection();
                });
    }
}
