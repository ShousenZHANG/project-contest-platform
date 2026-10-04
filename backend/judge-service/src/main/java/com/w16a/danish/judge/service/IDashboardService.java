package com.w16a.danish.judge.service;

import com.w16a.danish.judge.domain.vo.CompetitionDashboardVO;
import com.w16a.danish.judge.domain.vo.PlatformDashboardVO;
import com.w16a.danish.common.context.RequestContext;

/**
 * Service interface for retrieving dashboard statistics.
 *
 * <p>
 * Provides methods to gather competition-specific and platform-wide statistical data
 * for visualization on dashboards.
 * </p>
 *
 * @since 2025-04-19
 */
public interface IDashboardService {

    /**
     * Retrieves statistical data for a specific competition,
     * such as the number of participants, submissions, and winners.
     *
     * @param competitionId the ID of the competition
     * @param userId legacy ignored parameter; public reads never resolve personal information
     * @return a {@link CompetitionDashboardVO} containing competition-related statistics
     */
    CompetitionDashboardVO getCompetitionStatistics(String competitionId, String userId);

    CompetitionDashboardVO getManagedCompetitionStatistics(RequestContext ctx, String competitionId);

    /**
     * Retrieves platform-wide aggregated statistics,
     * such as the total number of competitions, participants, and submissions.
     *
     * @return a {@link PlatformDashboardVO} containing overall platform metrics
     */
    PlatformDashboardVO getPlatformDashboard();
}
