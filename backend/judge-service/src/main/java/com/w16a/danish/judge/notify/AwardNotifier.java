package com.w16a.danish.judge.notify;

import com.w16a.danish.common.messaging.MessagingConstants;
import com.w16a.danish.common.messaging.message.AwardWinnerMessage;
import lombok.RequiredArgsConstructor;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.common.recovery.NotificationOutbox;
import org.springframework.stereotype.Component;

/**
 * MQ sender for notifying award winners.
 * Sends messages to judge.topic exchange with routing key award.winner.
 * (judge-service -> user-service or other downstreams)
 *
 * @author Eddy
 * @date 2025/04/19
 */
@Component
@RequiredArgsConstructor
public class AwardNotifier {

    private final DurableTasks tasks;

    /**
     * Send an award winner notification message.
     *
     * @param message Award winner information (personal or team award)
     */
    public void sendAwardWinner(AwardWinnerMessage message) {
        tasks.enqueue("NOTIFICATION", null, null, NotificationOutbox.payload(
                MessagingConstants.JUDGE_EXCHANGE_NAME, MessagingConstants.AWARD_WINNER_ROUTING_KEY, message));
    }
}
