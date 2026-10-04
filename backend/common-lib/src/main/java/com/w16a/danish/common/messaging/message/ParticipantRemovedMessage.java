package com.w16a.danish.common.messaging.message;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/** Notification that an Organizer removed a Registration. */
@Data
public class ParticipantRemovedMessage implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    private String userName;
    private String userEmail;
    private String removedBy;
    private String competitionName;
    private LocalDateTime removedAt;
}
