package com.w16a.danish.registration.domain.po;

import lombok.Data;
import lombok.experimental.Accessors;

import java.math.BigDecimal;

/** Read-only evidence from the shared schema; this is not a separately persisted entity. */
@Data
@Accessors(chain = true)
public class SubmissionScoreSource {
    private String submissionId;
    private String judgeId;
    private String judgeRecordId;
    private String configuredCriteria;
    private BigDecimal judgeTotal;
    private String detailId;
    private String detailSubmissionId;
    private String criterion;
    private BigDecimal criterionScore;
}
