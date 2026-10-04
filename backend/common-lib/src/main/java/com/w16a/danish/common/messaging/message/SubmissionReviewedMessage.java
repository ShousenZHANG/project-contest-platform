package com.w16a.danish.common.messaging.message;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/** Notification of an Organizer's Review of a Submission. */
@Data
public class SubmissionReviewedMessage implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    private String userName;
    private String userEmail;
    private String competitionName;
    private String title;
    private String reviewStatus;
    private String reviewedBy;
    private String reviewComments;
    private LocalDateTime reviewedAt;
}
