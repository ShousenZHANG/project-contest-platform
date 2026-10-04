package com.w16a.danish.judge.domain.vo;

import lombok.Data;
import java.util.List;

@Data
public class AwardEligibilityVO {
    private String competitionId;
    private String status;
    private Boolean isPublic = Boolean.FALSE;
    private boolean canAward;
    private int minimumJudgeCount;
    private int approvedCount;
    private int eligibleCount;
    private List<ScoredSubmissionVO> submissions;
    private List<String> blockers;
}
