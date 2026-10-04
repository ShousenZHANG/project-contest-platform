package com.w16a.danish.judge.feign;

import com.w16a.danish.judge.domain.vo.*;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

/**
 * Feign client for calling Submission Service to fetch approved submissions for judging.
 *
 * @author Eddy
 * @since 2025-04-18
 */
@FeignClient(name = "registration-service", configuration = com.w16a.danish.common.security.InternalFeignConfiguration.class, fallback = com.w16a.danish.judge.feign.fallback.SubmissionServiceClientFallback.class)
public interface SubmissionServiceClient {

    /**
     * Get registration statistics (individual and team participants) for a competition.
     */
    @GetMapping("/registrations/internal/{competitionId}/statistics")
    ResponseEntity<RegistrationStatisticsVO> getRegistrationStatistics(
            @PathVariable("competitionId") String competitionId
    );

    /**
     * Get submission statistics (approved, pending, rejected counts) for a competition.
     */
    @GetMapping("/submissions/internal/{competitionId}/statistics")
    ResponseEntity<SubmissionStatisticsVO> getSubmissionStatistics(
            @PathVariable("competitionId") String competitionId
    );

    /**
     * Get participant registration trend (individual & team) for a competition.
     */
    @GetMapping("/registrations/internal/{competitionId}/participant-trend")
    ResponseEntity<Map<String, Map<String, Integer>>> getParticipantTrend(
            @PathVariable("competitionId") String competitionId
    );

    /**
     * Get submission upload trend (date -> number of submissions) for a competition.
     */
    @GetMapping("/submissions/internal/{competitionId}/submission-trend")
    ResponseEntity<Map<String, Integer>> getSubmissionTrend(
            @PathVariable("competitionId") String competitionId
    );

    /**
     * Public: Get platform participant statistics (individual + team participants).
     *
     * @return PlatformParticipantStatisticsVO
     */
    @GetMapping("/registrations/public/platform/participant-statistics")
    ResponseEntity<PlatformParticipantStatisticsVO> getPlatformParticipantStatistics();

    /**
     * Public: Get platform submission statistics (approved + pending + rejected).
     *
     * @return PlatformSubmissionStatisticsVO
     */
    @GetMapping("/submissions/public/platform/submission-statistics")
    ResponseEntity<PlatformSubmissionStatisticsVO> getPlatformSubmissionStatistics();

    /**
     * Public: Get platform-wide competition dashboard overview.
     *
     * @return PlatformDashboardVO
     */
    @GetMapping("/registrations/public/platform/participant-trend")
    ResponseEntity<Map<String, Map<String, Integer>>> getPlatformParticipantTrend();

    /**
     * Public: Get platform-wide submission trend (date -> number of submissions).
     *
     * @return Map<String, Integer>
     */
    @GetMapping("/submissions/public/platform/submission-trend")
    ResponseEntity<Map<String, Integer>> getPlatformSubmissionTrend();

    // ── Internal endpoints ────────────────────────────────────────────────────

    @GetMapping("/submissions/internal/approved")
    ResponseEntity<List<SubmissionInfoVO>> getApprovedSubmissions(@RequestParam("competitionId") String competitionId);

    /**
     * Update the aggregated total score on a submission record.
     */
    @PutMapping("/submissions/internal/{id}/total-score")
    ResponseEntity<Void> updateTotalScore(
            @PathVariable("id") String submissionId,
            @RequestParam("score") java.math.BigDecimal totalScore,
            @RequestParam("version") long version,
            @RequestParam("revision") int revision
    );

    /**
     * Get score statistics for all judged submissions in a competition.
     */
    @GetMapping("/submissions/internal/score-statistics")
    ResponseEntity<com.w16a.danish.judge.domain.vo.SubmissionScoreStatisticsVO> getScoreStatistics(
            @RequestParam("competitionId") String competitionId
    );

    /**
     * Get basic submission info for an individual participant.
     */
    @GetMapping("/submissions/internal/my-submission")
    ResponseEntity<SubmissionInfoVO> getMySubmissionBasic(
            @RequestParam("competitionId") String competitionId,
            @RequestParam("userId") String userId
    );

    /**
     * Get basic submission info for a team.
     */
    @GetMapping("/submissions/internal/team-submission")
    ResponseEntity<SubmissionInfoVO> getTeamSubmissionBasic(
            @RequestParam("competitionId") String competitionId,
            @RequestParam("teamId") String teamId
    );

    /**
     * Basic submission info for several teams at once.
     */
    @GetMapping("/submissions/internal/team-submissions")
    ResponseEntity<List<SubmissionInfoVO>> getTeamSubmissionsBasic(
            @RequestParam("competitionId") String competitionId,
            @RequestParam("teamIds") List<String> teamIds
    );

    /**
     * Get submissions by a list of IDs.
     */
    @PostMapping("/submissions/internal/by-ids")
    ResponseEntity<List<SubmissionInfoVO>> getSubmissionsByIds(
            @RequestBody List<String> submissionIds
    );
}
