package com.w16a.danish.common.messaging.message;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/** Notification of the awarding result for a Participant or Team member. */
@Data
public class AwardWinnerMessage implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    private String userName;
    private String userEmail;
    private String competitionName;
    private String awardName;
    private LocalDateTime awardedAt;
}
