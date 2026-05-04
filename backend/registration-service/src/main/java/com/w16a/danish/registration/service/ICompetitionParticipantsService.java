package com.w16a.danish.registration.service;

import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.registration.domain.po.CompetitionParticipants;
import com.baomidou.mybatisplus.extension.service.IService;
import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.registration.domain.vo.*;

import java.util.Map;

/**
 * Service interface for managing competition participant and team registrations.
 * Provides participant and team registration management, cancellation, status queries,
 * search and pagination functionalities, as well as platform-level statistical reports.
 *
 * @author Eddy
 * @date 2025/04/03
 */
public interface ICompetitionParticipantsService extends IService<CompetitionParticipants> {

    /**
     * Register an individual user for a competition.
     *
     * @param competitionId ID of the competition
     * @param ctx identity context of the caller
     */
    void register(String competitionId, RequestContext ctx);

    /**
     * Cancel an individual's registration for a competition.
     *
     * @param competitionId ID of the competition
     * @param ctx identity context of the caller
     */
    void cancelRegistration(String competitionId, RequestContext ctx);

    /**
     * Check whether an individual is registered for a competition.
     *
     * @param competitionId ID of the competition
     * @param ctx identity context of the caller
     * @return true if registered, false otherwise
     */
    boolean isRegistered(String competitionId, RequestContext ctx);

    /**
     * Retrieve paginated list of participants in a competition with optional search and sorting.
     *
     * @param competitionId ID of the competition
     * @param ctx identity context of the organizer querying
     * @param page Page number
     * @param size Page size
     * @param keyword Search keyword
     * @param sortBy Field to sort by
     * @param order Sort order ("asc" or "desc")
     * @return Paginated response of participant information
     */
    PageResponse<ParticipantInfoVO> getParticipantsByCompetitionWithSearch(
            String competitionId,
            RequestContext ctx,
            int page,
            int size,
            String keyword,
            String sortBy,
            String order
    );

    /**
     * Retrieve paginated list of competitions that a user has registered for, with optional search and sorting.
     *
     * @param ctx identity context of the caller
     * @param page Page number
     * @param size Page size
     * @param keyword Search keyword
     * @param sortBy Field to sort by
     * @param order Sort order ("asc" or "desc")
     * @return Paginated response of competition participation information
     */
    PageResponse<CompetitionParticipationVO> getMyCompetitionsWithSearch(
            RequestContext ctx,
            int page,
            int size,
            String keyword,
            String sortBy,
            String order
    );

    /**
     * Organizer forcibly cancels a participant's registration.
     *
     * @param competitionId ID of the competition
     * @param participantUserId ID of the participant to be removed
     * @param ctx identity context of the organizer
     */
    void cancelByOrganizer(String competitionId, String participantUserId, RequestContext ctx);

    /**
     * Register a team for a competition.
     *
     * @param competitionId ID of the competition
     * @param teamId ID of the team
     * @param ctx identity context of the caller
     */
    void registerTeam(String competitionId, String teamId, RequestContext ctx);

    /**
     * Cancel a team's registration for a competition.
     *
     * @param competitionId ID of the competition
     * @param teamId ID of the team
     * @param ctx identity context of the caller
     */
    void cancelTeamRegistration(String competitionId, String teamId, RequestContext ctx);

    /**
     * Check whether a team is registered for a competition.
     *
     * @param competitionId ID of the competition
     * @param teamId ID of the team
     * @return true if registered, false otherwise
     */
    boolean isTeamRegistered(String competitionId, String teamId);

    /**
     * Retrieve paginated list of teams registered for a competition, with optional search and sorting.
     *
     * @param competitionId ID of the competition
     * @param page Page number
     * @param size Page size
     * @param keyword Search keyword
     * @param sortBy Field to sort by
     * @param order Sort order ("asc" or "desc")
     * @return Paginated response of team information
     */
    PageResponse<TeamInfoVO> getTeamsByCompetitionWithSearch(String competitionId,
                                                             int page,
                                                             int size,
                                                             String keyword,
                                                             String sortBy,
                                                             String order);

    /**
     * Retrieve paginated list of competitions a team has registered for, with optional search and sorting.
     *
     * @param teamId ID of the team
     * @param page Page number
     * @param size Page size
     * @param keyword Search keyword
     * @param sortBy Field to sort by
     * @param order Sort order ("asc" or "desc")
     * @return Paginated response of competition participation information
     */
    PageResponse<CompetitionParticipationVO> getCompetitionsRegisteredByTeam(
            String teamId, int page, int size, String keyword, String sortBy, String order
    );

    /**
     * Organizer forcibly cancels a team's registration.
     *
     * @param competitionId ID of the competition
     * @param teamId ID of the team
     * @param ctx identity context of the organizer
     */
    void cancelTeamByOrganizer(String competitionId, String teamId, RequestContext ctx);

    /**
     * Check whether a team has any existing registrations.
     *
     * @param teamId ID of the team
     * @return true if there is any registration, false otherwise
     */
    Boolean existsRegistrationByTeamId(String teamId);

    /**
     * Get statistics summary for a competition, including total participants and teams.
     *
     * @param competitionId ID of the competition
     * @return Registration statistics
     */
    RegistrationStatisticsVO getRegistrationStatistics(String competitionId);

    /**
     * Get daily participant registration trends for a specific competition.
     *
     * @param competitionId ID of the competition
     * @return A map of date to registration counts
     */
    Map<String, Map<String, Integer>> getParticipantTrend(String competitionId);

    /**
     * Get overall platform participant statistics across all competitions.
     *
     * @return Platform-wide participant statistics
     */
    PlatformParticipantStatisticsVO getPlatformParticipantStatistics();

    /**
     * Get daily participant registration trends across all competitions on the platform.
     *
     * @return A map of date to registration counts
     */
    Map<String, Map<String, Integer>> getPlatformParticipantTrend();

}
