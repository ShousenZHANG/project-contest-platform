package com.w16a.danish.competition.notify;

import com.w16a.danish.common.messaging.MessagingConstants;
import com.w16a.danish.common.messaging.message.JudgeAssignedMessage;
import com.w16a.danish.common.messaging.message.JudgeRemovedMessage;
import lombok.RequiredArgsConstructor;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.common.recovery.NotificationOutbox;
import org.springframework.stereotype.Component;

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

    private final DurableTasks tasks;

    /**
     * Send judge assigned message.
     */
    public void sendJudgeAssigned(JudgeAssignedMessage message) {
        tasks.enqueue("NOTIFICATION", null, null, NotificationOutbox.payload(
                MessagingConstants.COMPETITION_EXCHANGE_NAME, MessagingConstants.JUDGE_ASSIGNED_ROUTING_KEY, message));
    }

    /**
     * Send judge removed message.
     */
    public void sendJudgeRemoved(JudgeRemovedMessage message) {
        tasks.enqueue("NOTIFICATION", null, null, NotificationOutbox.payload(
                MessagingConstants.COMPETITION_EXCHANGE_NAME, MessagingConstants.JUDGE_REMOVED_ROUTING_KEY, message));
    }
}
