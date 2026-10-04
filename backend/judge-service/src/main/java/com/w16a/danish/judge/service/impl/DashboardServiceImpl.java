package com.w16a.danish.judge.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.w16a.danish.common.domain.enums.ParticipationType;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.judge.domain.vo.CompetitionDashboardVO;
import com.w16a.danish.judge.domain.vo.PlatformDashboardVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.judge.gateway.CompetitionGateway;
import com.w16a.danish.judge.feign.InteractionServiceClient;
import com.w16a.danish.judge.feign.SubmissionServiceClient;
import com.w16a.danish.judge.feign.UserServiceClient;
import com.w16a.danish.judge.service.ICompetitionJudgesService;
import com.w16a.danish.judge.service.IDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;

/**
 * Implementation of the Dashboard Service, retrieving statistics via Feign clients.
 * Fully decoupled from direct database access.
 *
 * @author Eddy
 * @date 2025/04/20
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements IDashboardService {

    private final CompetitionGateway competitionGateway;
    private final SubmissionServiceClient registrationServiceClient;
    private final InteractionServiceClient interactionServiceClient;
    private final ICompetitionJudgesService competitionJudgesService;
    private final UserServiceClient userServiceClient;

    @Override
    public CompetitionDashboardVO getCompetitionStatistics(String competitionId, String userId) {
        var competition = competitionGateway.require(competitionId);
        if (!Boolean.TRUE.equals(competition.getIsPublic())) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found");
        }
        return loadStatistics(competitionId, competition, null);
    }

    @Override
    public CompetitionDashboardVO getManagedCompetitionStatistics(RequestContext ctx, String competitionId) {
        var competition = competitionGateway.require(competitionId);
        if (ctx == null || ctx.userId() == null || ctx.userId().isBlank()) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (!Boolean.TRUE.equals(competition.getIsPublic()) && !ctx.isAdmin()
                && !(ctx.isOrganizer() && competitionGateway.isOrganiser(competitionId, ctx.userId()))) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only competition organizers or admins can view a private dashboard");
        }
        return loadStatistics(competitionId, competition, ctx.userId());
    }

    private CompetitionDashboardVO loadStatistics(String competitionId, CompetitionResponseVO competition, String userId) {

        CompetitionDashboardVO dashboard = new CompetitionDashboardVO();
        dashboard.setCompetitionName(competition.getName());
        dashboard.setCompetitionStatus(competition.getStatus().getValue());
        dashboard.setParticipationType(competition.getParticipationType().name());

        var registrationStatsResp = registrationServiceClient.getRegistrationStatistics(competitionId);
        var registrationStats = requiredBody(registrationStatsResp);
        if (registrationStats != null) {
            dashboard.setIndividualParticipantCount(registrationStats.getIndividualParticipantCount());
            dashboard.setTeamParticipantCount(registrationStats.getTeamParticipantCount());
        }

        var submissionStatsResp = registrationServiceClient.getSubmissionStatistics(competitionId);
        var submissionStats = requiredBody(submissionStatsResp);
        if (submissionStats != null) {
            dashboard.setSubmissionCount(submissionStats.getTotalSubmissions());
            dashboard.setApprovedSubmissionCount(submissionStats.getApprovedSubmissions());
            dashboard.setPendingSubmissionCount(submissionStats.getPendingSubmissions());
        }

        var interactionStatsResp = interactionServiceClient.getInteractionStatistics(competitionId);
        var interactionStats = requiredBody(interactionStatsResp);
        if (interactionStats != null) {
            dashboard.setVoteCount(interactionStats.getVoteCount() != null ? Math.toIntExact(interactionStats.getVoteCount()) : 0);
            dashboard.setCommentCount(interactionStats.getCommentCount() != null ? Math.toIntExact(interactionStats.getCommentCount()) : 0);
        }

        int judgeCount = competitionJudgesService.countJudgesByCompetitionId(competitionId);
        dashboard.setJudgeCount(judgeCount);

        var scoreStatsResp = registrationServiceClient.getScoreStatistics(competitionId);
        var scoreStats = requiredBody(scoreStatsResp);
        if (scoreStats != null) {
            dashboard.setAverageScore(scoreStats.getAverageScore());
            dashboard.setHighestScore(scoreStats.getHighestScore());
            dashboard.setLowestScore(scoreStats.getLowestScore());
        }

        Optional.of(requiredBody(registrationServiceClient.getParticipantTrend(competitionId)))
                .ifPresent(participantTrendMap -> {
                    Map<String, Integer> individualTrend = Optional.ofNullable(participantTrendMap.get("individual")).orElseGet(Map::of);
                    Map<String, Integer> teamTrend = Optional.ofNullable(participantTrendMap.get("team")).orElseGet(Map::of);

                    dashboard.setIndividualParticipantTrend(individualTrend);
                    dashboard.setTeamParticipantTrend(teamTrend);
                });

        Optional.of(requiredBody(registrationServiceClient.getSubmissionTrend(competitionId)))
                .ifPresent(dashboard::setSubmissionTrend);

        if (userId != null) {
            boolean hasSubmitted = false;

            ParticipationType participationType = competition.getParticipationType();
            if (participationType == ParticipationType.INDIVIDUAL) {
                var mySubmission = checkedBody(registrationServiceClient.getMySubmissionBasic(competitionId, userId));
                if (mySubmission != null) {
                    hasSubmitted = true;
                    dashboard.setMyTotalScore(mySubmission.getTotalScore());
                    dashboard.setMyReviewStatus(mySubmission.getReviewStatus());
                }
            } else if (participationType == ParticipationType.TEAM) {
                var teamIdsResp = userServiceClient.getJoinedTeamIdsByUser(userId);
                List<String> teamIds = requiredBody(teamIdsResp);

                if (CollUtil.isNotEmpty(teamIds)) {
                    // One read for every team the user belongs to. This used to be a
                    // remote call per team, issued serially, so the dashboard got slower
                    // the more teams someone joined.
                    var teamSubmissions = requiredBody(registrationServiceClient.getTeamSubmissionsBasic(competitionId, teamIds));

                    var teamSubmission = teamSubmissions.stream().findFirst().orElse(null);
                    if (teamSubmission != null) {
                        hasSubmitted = true;
                        dashboard.setMyTotalScore(teamSubmission.getTotalScore());
                        dashboard.setMyReviewStatus(teamSubmission.getReviewStatus());
                    }
                }
            }
            dashboard.setHasSubmitted(hasSubmitted);
        }

        return dashboard;
    }

    @Override
    public PlatformDashboardVO getPlatformDashboard() {
        PlatformDashboardVO dashboard = new PlatformDashboardVO();

        var competitions = competitionGateway.listAll().stream()
                .filter(competition -> Boolean.TRUE.equals(competition.getIsPublic())).toList();

        if (competitions.isEmpty()) {
            return dashboard;
        }

        int totalCompetitions = competitions.size();
        int individualCompetitions = 0;
        int teamCompetitions = 0;
        int activeCompetitions = 0;
        int finishedCompetitions = 0;

        for (var competition : competitions) {
            if (competition.getParticipationType() == ParticipationType.INDIVIDUAL) {
                individualCompetitions++;
            } else if (competition.getParticipationType() == ParticipationType.TEAM) {
                teamCompetitions++;
            }

            if (competition.getStatus() != null) {
                switch (competition.getStatus()) {
                    case ONGOING -> activeCompetitions++;
                    case COMPLETED, AWARDED -> finishedCompetitions++;
                    default -> {
                    }
                }
            }
        }

        dashboard.setTotalCompetitions(totalCompetitions);
        dashboard.setIndividualCompetitions(individualCompetitions);
        dashboard.setTeamCompetitions(teamCompetitions);
        dashboard.setActiveCompetitions(activeCompetitions);
        dashboard.setFinishedCompetitions(finishedCompetitions);

        var participantStatsResp = registrationServiceClient.getPlatformParticipantStatistics();
        var participantStats = requiredBody(participantStatsResp);
        if (participantStats != null) {
            dashboard.setTotalParticipants(participantStats.getTotalParticipants());
            dashboard.setIndividualParticipants(participantStats.getIndividualParticipants());
            dashboard.setTeamParticipants(participantStats.getTeamParticipants());
        }

        var submissionStatsResp = registrationServiceClient.getPlatformSubmissionStatistics();
        var submissionStats = requiredBody(submissionStatsResp);
        if (submissionStats != null) {
            dashboard.setTotalSubmissions(submissionStats.getTotalSubmissions());
            dashboard.setApprovedSubmissions(submissionStats.getApprovedSubmissions());
            dashboard.setIndividualSubmissions(submissionStats.getIndividualSubmissions());
            dashboard.setTeamSubmissions(submissionStats.getTeamSubmissions());
        }

        var interactionStatsResp = interactionServiceClient.getPlatformInteractionStatistics();
        var interactionStats = requiredBody(interactionStatsResp);
        if (interactionStats != null) {
            dashboard.setTotalVotes(Optional.ofNullable(interactionStats.getVoteCount()).map(Math::toIntExact).orElse(0));
            dashboard.setTotalComments(Optional.ofNullable(interactionStats.getCommentCount()).map(Math::toIntExact).orElse(0));
        }

        var participantTrendResp = registrationServiceClient.getPlatformParticipantTrend();
        var participantTrend = requiredBody(participantTrendResp);
        if (participantTrend != null) {
            dashboard.setParticipantTrend(participantTrend);
        }

        var submissionTrendResp = registrationServiceClient.getPlatformSubmissionTrend();
        var submissionTrend = requiredBody(submissionTrendResp);
        if (submissionTrend != null) {
            dashboard.setSubmissionTrend(submissionTrend);
        }

        return dashboard;
    }
    private static <T> T checkedBody(ResponseEntity<T> response) {
        if (response == null || !response.getStatusCode().is2xxSuccessful()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Dashboard dependency is unavailable.");
        }
        return response.getBody();
    }

    private static <T> T requiredBody(ResponseEntity<T> response) {
        T body = checkedBody(response);
        if (body == null) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Dashboard dependency returned no data.");
        }
        return body;
    }
}
