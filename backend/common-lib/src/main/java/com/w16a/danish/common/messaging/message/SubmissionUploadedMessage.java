package com.w16a.danish.common.messaging.message;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/** Confirmation that a Submission was uploaded or replaced. */
@Data
public class SubmissionUploadedMessage implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    private String userName;
    private String userEmail;
    private String competitionName;
    private String title;
    private LocalDateTime submittedAt;
}
