package com.w16a.danish.common.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.messaging.message.AwardWinnerMessage;
import com.w16a.danish.common.messaging.message.JudgeAssignedMessage;
import com.w16a.danish.common.messaging.message.JudgeRemovedMessage;
import com.w16a.danish.common.messaging.message.ParticipantRemovedMessage;
import com.w16a.danish.common.messaging.message.RegisterSuccessMessage;
import com.w16a.danish.common.messaging.message.SubmissionReviewedMessage;
import com.w16a.danish.common.messaging.message.SubmissionUploadedMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationMessageConverterTest {

    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();

    @ParameterizedTest
    @MethodSource("contracts")
    void preservesPublishedJsonFieldsDatesAndHistoricalProducerTypeId(Contract contract) throws Exception {
        Object payload = JSON.readValue(contract.json(), contract.messageType());
        Jackson2JsonMessageConverter publisher = NotificationMessageConverter.create();
        Message published = publisher.toMessage(payload, new MessageProperties());

        assertThat(published.getMessageProperties().getContentType()).isEqualTo(MessageProperties.CONTENT_TYPE_JSON);
        assertThat(published.getMessageProperties().getHeaders()).containsEntry("__TypeId__", contract.publisherTypeId());
        assertThat(JSON.readTree(published.getBody())).isEqualTo(JSON.readTree(contract.json()));
        assertThat(NotificationMessageConverter.create().fromMessage(published)).isEqualTo(payload);
    }

    @ParameterizedTest
    @MethodSource("contracts")
    void readsPreviouslyQueuedProducerMessagesWithoutLoadingDeletedClasses(Contract contract) throws Exception {
        Message message = legacyMessage(contract, contract.publisherTypeId());

        assertThat(NotificationMessageConverter.create().fromMessage(message))
                .isEqualTo(JSON.readValue(contract.json(), contract.messageType()));
    }

    @ParameterizedTest
    @MethodSource("contracts")
    void acceptsHistoricalConsumerAliasesAndAlwaysRepublishesTheProducerTypeId(Contract contract) throws Exception {
        Message message = legacyMessage(contract, "com.w16a.danish.user.domain.mq." + contract.messageType().getSimpleName());
        Jackson2JsonMessageConverter converter = NotificationMessageConverter.create();
        Object decoded = converter.fromMessage(message);
        Message republished = converter.toMessage(decoded, new MessageProperties());

        assertThat(decoded).isEqualTo(JSON.readValue(contract.json(), contract.messageType()));
        assertThat(republished.getMessageProperties().getHeaders()).containsEntry("__TypeId__", contract.publisherTypeId());
    }

    @ParameterizedTest
    @MethodSource("contracts")
    void concreteListenerTypesStillTakePrecedenceForRollingUpdates(Contract contract) throws Exception {
        Message message = legacyMessage(contract, "a.previous.deployment.Message");
        message.getMessageProperties().setInferredArgumentType(contract.messageType());

        assertThat(NotificationMessageConverter.create().fromMessage(message))
                .isEqualTo(JSON.readValue(contract.json(), contract.messageType()));
    }

    @Test
    void optionalReviewFieldsRemainNullable() {
        SubmissionReviewedMessage review = new SubmissionReviewedMessage();
        review.setReviewStatus("APPROVED");
        Jackson2JsonMessageConverter converter = NotificationMessageConverter.create();

        assertThat(converter.fromMessage(converter.toMessage(review, new MessageProperties()))).isEqualTo(review);
    }

    @Test
    void unrelatedJsonMessagesKeepTheDefaultConversionBehavior() {
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("status", "ok");
        Jackson2JsonMessageConverter converter = NotificationMessageConverter.create();
        Message message = converter.toMessage(payload, new MessageProperties());

        assertThat(message.getMessageProperties().getHeaders()).containsEntry("__TypeId__", LinkedHashMap.class.getName());
        assertThat(converter.fromMessage(message)).isEqualTo(payload);
    }

    private static Message legacyMessage(Contract contract, String typeId) {
        MessageProperties properties = new MessageProperties();
        properties.setContentType(MessageProperties.CONTENT_TYPE_JSON);
        properties.setHeader("__TypeId__", typeId);
        return new Message(contract.json().getBytes(StandardCharsets.UTF_8), properties);
    }

    private static Stream<Contract> contracts() {
        return Stream.of(
                new Contract(JudgeAssignedMessage.class, "competition", """
                        {"judgeName":"张三","judgeEmail":"judge@example.com","competitionName":"Innovation",
                         "assignedAt":[2026,10,4,14,30,15]}
                        """),
                new Contract(JudgeRemovedMessage.class, "competition", """
                        {"judgeName":"张三","judgeEmail":"judge@example.com","competitionName":"Innovation",
                         "removedAt":[2026,10,4,14,30,15]}
                        """),
                new Contract(RegisterSuccessMessage.class, "registration", """
                        {"userName":"张三","userEmail":"participant@example.com","competitionName":"Innovation",
                         "registerTime":[2026,10,4,14,30,15]}
                        """),
                new Contract(ParticipantRemovedMessage.class, "registration", """
                        {"userName":"张三","userEmail":"participant@example.com","removedBy":"Organizer",
                         "competitionName":"Innovation","removedAt":[2026,10,4,14,30,15]}
                        """),
                new Contract(SubmissionUploadedMessage.class, "registration", """
                        {"userName":"张三","userEmail":"participant@example.com","competitionName":"Innovation",
                         "title":"Prototype","submittedAt":[2026,10,4,14,30,15]}
                        """),
                new Contract(SubmissionReviewedMessage.class, "registration", """
                        {"userName":"张三","userEmail":"participant@example.com","competitionName":"Innovation",
                         "title":"Prototype","reviewStatus":"APPROVED","reviewedBy":"Organizer",
                         "reviewComments":"通过","reviewedAt":[2026,10,4,14,30,15]}
                        """),
                new Contract(AwardWinnerMessage.class, "judge", """
                        {"userName":"张三","userEmail":"participant@example.com","competitionName":"Innovation",
                         "awardName":"First Prize","awardedAt":[2026,10,4,14,30,15]}
                        """)
        );
    }

    private record Contract(Class<?> messageType, String producer, String json) {
        private String publisherTypeId() {
            return "com.w16a.danish." + producer + ".domain.mq." + messageType.getSimpleName();
        }
    }
}
