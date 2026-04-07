package com.w16a.danish.registration.service;

import com.w16a.danish.registration.domain.vo.PlatformSubmissionStatisticsVO;
import com.w16a.danish.registration.domain.vo.SubmissionInfoVO;
import com.w16a.danish.registration.domain.vo.SubmissionScoreStatisticsVO;
import com.w16a.danish.registration.domain.vo.SubmissionStatisticsVO;

import java.util.List;
import java.util.Map;

/**
 * Analytics service for submission statistics and reporting.
 * Extracted from {@link ISubmissionRecordsService} to reduce God-Service bloat.
 *
 * <p>All methods are read-only aggregations — no side effects.</p>
 *
 * @author Eddy ZHANG
 */
public interface ISubmissionAnalyticsService {

    /**
     * Get submission status counts (total / approved / pending / rejected) for a competition.
     */
    SubmissionStatisticsVO getSubmissionStatistics(String competitionId);

    /**
     * Get daily submission upload trend (date → count) for a competition.
     */
    Map<String, Integer> getSubmissionTrend(String competitionId);

    /**
     * Get platform-wide submission statistics.
     */
    PlatformSubmissionStatisticsVO getPlatformSubmissionStatistics();

    /**
     * Get platform-wide daily submission trend.
     */
    Map<String, Integer> getPlatformSubmissionTrend();

    // ── Internal endpoints (called by judge-service via Feign) ────────────────

    /**
     * Get score statistics (avg / max / min) for judged submissions in a competition.
     */
    SubmissionScoreStatisticsVO getScoreStatistics(String competitionId);

    /**
     * List all scored (totalScore IS NOT NULL) submissions for a competition.
     */
    List<SubmissionInfoVO> getScoredSubmissions(String competitionId);

    /**
     * Fetch submissions by a set of IDs.
     */
    List<SubmissionInfoVO> getSubmissionsByIds(List<String> submissionIds);
}
