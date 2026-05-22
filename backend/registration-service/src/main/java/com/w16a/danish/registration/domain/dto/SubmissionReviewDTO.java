package com.w16a.danish.registration.domain.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 *
 * This class represents the data transfer object for reviewing a submission.
 *
 * @author Eddy ZHANG
 * @date 2025/04/06
 */
@Data
@Schema(name = "SubmissionReviewDTO", description = "Request body for reviewing a submission")
public class SubmissionReviewDTO {

    @NotBlank(message = "submissionId is required")
    @Schema(description = "Submission ID to review", required = true)
    private String submissionId;

    @NotBlank(message = "reviewStatus is required")
    @Pattern(regexp = "APPROVED|REJECTED", message = "reviewStatus must be APPROVED or REJECTED")
    @Schema(description = "Review decision: APPROVED / REJECTED", required = true, example = "APPROVED")
    private String reviewStatus;

    @Size(max = 2000, message = "reviewComments must be at most 2000 characters")
    @Schema(description = "Review comment or feedback", example = "Great submission, well structured.")
    private String reviewComments;

}
