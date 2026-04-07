package com.w16a.danish.registration.domain.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Score statistics for approved submissions in a competition.
 * Served via internal API consumed by judge-service.
 */
@Data
@Schema(description = "Score statistics for approved submissions")
public class SubmissionScoreStatisticsVO {

    @Schema(description = "Average total score across all judged submissions")
    private BigDecimal averageScore;

    @Schema(description = "Highest total score among judged submissions")
    private BigDecimal highestScore;

    @Schema(description = "Lowest total score among judged submissions")
    private BigDecimal lowestScore;
}
