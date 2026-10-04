package com.w16a.danish.common.messaging.message;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/** Notification sent when an Organizer removes a Judge from a Competition. */
@Data
public class JudgeRemovedMessage implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    private String judgeName;
    private String judgeEmail;
    private String competitionName;
    private LocalDateTime removedAt;
}
