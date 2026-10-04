package com.w16a.danish.judge.domain.vo;

import lombok.Data;
import java.util.List;

@Data
public class JudgingSubmissionVO {
    private String id;
    private String competitionId;
    private String competitionStatus;
    private Integer revision;
    private String title;
    private String description;
    private String fileName;
    private String fileUrl;
    private String fileType;
    private String reviewStatus;
    private List<String> scoringCriteria;
    private boolean hasScored;
    private boolean requiresRescore;
    private boolean canScore;
}
