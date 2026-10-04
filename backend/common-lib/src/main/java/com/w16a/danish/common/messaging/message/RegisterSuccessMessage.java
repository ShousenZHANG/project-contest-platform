package com.w16a.danish.common.messaging.message;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/** Confirmation of an individual or Team Registration. */
@Data
public class RegisterSuccessMessage implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    private String userName;
    private String userEmail;
    private String competitionName;
    private LocalDateTime registerTime;
}
