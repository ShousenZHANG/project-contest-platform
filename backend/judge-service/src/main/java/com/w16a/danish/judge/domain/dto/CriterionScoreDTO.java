package com.w16a.danish.judge.domain.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO for representing an individual criterion's score given by a judge.
 * One Submission can have multiple such criterion scores.
 *
 * @author Eddy
 * @since 2025-04-18
 */
@Data
@Schema(description = "Individual scoring item under a judge's evaluation.")
public class CriterionScoreDTO {

    @NotBlank(message = "criterion is required")
    @Schema(description = "Criterion name", example = "Creativity", required = true)
    private String criterion;

    @NotNull(message = "score is required")
    @DecimalMin(value = "0.0", message = "score must be >= 0")
    @DecimalMax(value = "100.0", message = "score must be <= 100")
    @Schema(description = "Score assigned for this criterion", example = "8.5", required = true)
    private BigDecimal score;

    @NotNull(message = "weight is required")
    @DecimalMin(value = "0.0", message = "weight must be >= 0")
    @DecimalMax(value = "100.0", message = "weight must be <= 100")
    @Schema(description = "Weight of this criterion", example = "0.4", required = true)
    private BigDecimal weight;
}
