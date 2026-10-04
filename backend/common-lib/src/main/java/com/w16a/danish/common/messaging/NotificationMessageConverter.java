package com.w16a.danish.common.messaging;

import com.fasterxml.jackson.databind.JavaType;
import com.w16a.danish.common.messaging.message.AwardWinnerMessage;
import com.w16a.danish.common.messaging.message.JudgeAssignedMessage;
import com.w16a.danish.common.messaging.message.JudgeRemovedMessage;
import com.w16a.danish.common.messaging.message.ParticipantRemovedMessage;
import com.w16a.danish.common.messaging.message.RegisterSuccessMessage;
import com.w16a.danish.common.messaging.message.SubmissionReviewedMessage;
import com.w16a.danish.common.messaging.message.SubmissionUploadedMessage;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

import java.util.HashMap;
import java.util.Map;

/** Shared JSON contract, retaining historical AMQP type IDs for queued messages and rolling updates. */
public final class NotificationMessageConverter {

    private static final Map<Class<?>, String> PUBLISHER_TYPE_IDS = Map.of(
            JudgeAssignedMessage.class, "com.w16a.danish.competition.domain.mq.JudgeAssignedMessage",
            JudgeRemovedMessage.class, "com.w16a.danish.competition.domain.mq.JudgeRemovedMessage",
            RegisterSuccessMessage.class, "com.w16a.danish.registration.domain.mq.RegisterSuccessMessage",
            ParticipantRemovedMessage.class, "com.w16a.danish.registration.domain.mq.ParticipantRemovedMessage",
            SubmissionUploadedMessage.class, "com.w16a.danish.registration.domain.mq.SubmissionUploadedMessage",
            SubmissionReviewedMessage.class, "com.w16a.danish.registration.domain.mq.SubmissionReviewedMessage",
            AwardWinnerMessage.class, "com.w16a.danish.judge.domain.mq.AwardWinnerMessage"
    );

    private NotificationMessageConverter() {
    }

    public static Jackson2JsonMessageConverter create() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        converter.setJavaTypeMapper(new NotificationTypeMapper());
        return converter;
    }

    private static final class NotificationTypeMapper extends DefaultJackson2JavaTypeMapper {
        private NotificationTypeMapper() {
            Map<String, Class<?>> aliases = new HashMap<>();
            PUBLISHER_TYPE_IDS.forEach((messageClass, publisherTypeId) -> {
                aliases.put(publisherTypeId, messageClass);
                aliases.put("com.w16a.danish.user.domain.mq." + messageClass.getSimpleName(), messageClass);
            });
            setIdClassMapping(aliases);
        }

        @Override
        public void fromJavaType(JavaType javaType, MessageProperties properties) {
            super.fromJavaType(javaType, properties);
            // The default reverse map cannot choose deterministically between legacy aliases.
            String publisherTypeId = PUBLISHER_TYPE_IDS.get(javaType.getRawClass());
            if (publisherTypeId != null) {
                properties.setHeader(getClassIdFieldName(), publisherTypeId);
            }
        }
    }
}
