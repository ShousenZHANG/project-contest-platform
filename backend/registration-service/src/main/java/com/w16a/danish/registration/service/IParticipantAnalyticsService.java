package com.w16a.danish.registration.service;

import com.w16a.danish.registration.domain.vo.PlatformParticipantStatisticsVO;
import com.w16a.danish.registration.domain.vo.RegistrationStatisticsVO;

import java.util.Map;

/**
 * Read-only reporting over registrations.
 *
 * <p>Split out of the participant registration service for the same reason
 * {@link ISubmissionAnalyticsService} was split out of submissions: counting and trending
 * registrations changes for reporting reasons, while registering and cancelling change for
 * registration reasons. Keeping them together meant one 800-line class with two unrelated
 * pressures on it.
 *
 * <p>Everything here is a read. Nothing on this interface writes.
 */
public interface IParticipantAnalyticsService {

    /**
     * Individual and team registration counts for one competition.
     *
     * @param competitionId competition to report on
     * @return the counts, never null
     */
    RegistrationStatisticsVO getRegistrationStatistics(String competitionId);

    /**
     * Daily registration counts for one competition, keyed "individual" and "team".
     *
     * @param competitionId competition to report on
     * @return date-to-count maps under each participation kind
     */
    Map<String, Map<String, Integer>> getParticipantTrend(String competitionId);

    /** Registration counts across the whole platform. */
    PlatformParticipantStatisticsVO getPlatformParticipantStatistics();

    /** Daily registration counts across the whole platform, keyed "individual" and "team". */
    Map<String, Map<String, Integer>> getPlatformParticipantTrend();
}
