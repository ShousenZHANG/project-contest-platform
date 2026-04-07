package com.w16a.danish.judge.feign.fallback;

import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.judge.domain.vo.*;
import com.w16a.danish.judge.feign.SubmissionServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class SubmissionServiceClientFallback implements SubmissionServiceClient {

    @Override
    public ResponseEntity<PageResponse<SubmissionInfoVO>> listApprovedSubmissionsPublic(
            String competitionId, int page, int size, String keyword, String sortBy, String order) {
        log.warn("[Fallback] registration-service unavailable — listApprovedSubmissionsPublic");
        return ResponseEntity.ok(new PageResponse<>(Collections.emptyList(), 0, page, size, 0));
    }

    @Override
    public ResponseEntity<RegistrationStatisticsVO> getRegistrationStatistics(String competitionId) {
        log.warn("[Fallback] registration-service unavailable — getRegistrationStatistics");
        return ResponseEntity.ok(new RegistrationStatisticsVO());
    }

    @Override
    public ResponseEntity<SubmissionStatisticsVO> getSubmissionStatistics(String competitionId) {
        log.warn("[Fallback] registration-service unavailable — getSubmissionStatistics");
        return ResponseEntity.ok(new SubmissionStatisticsVO());
    }

    @Override
    public ResponseEntity<Map<String, Map<String, Integer>>> getParticipantTrend(String competitionId) {
        log.warn("[Fallback] registration-service unavailable — getParticipantTrend");
        return ResponseEntity.ok(Collections.emptyMap());
    }

    @Override
    public ResponseEntity<Map<String, Integer>> getSubmissionTrend(String competitionId) {
        log.warn("[Fallback] registration-service unavailable — getSubmissionTrend");
        return ResponseEntity.ok(Collections.emptyMap());
    }

    @Override
    public ResponseEntity<PlatformParticipantStatisticsVO> getPlatformParticipantStatistics() {
        log.warn("[Fallback] registration-service unavailable — getPlatformParticipantStatistics");
        return ResponseEntity.ok(new PlatformParticipantStatisticsVO());
    }

    @Override
    public ResponseEntity<PlatformSubmissionStatisticsVO> getPlatformSubmissionStatistics() {
        log.warn("[Fallback] registration-service unavailable — getPlatformSubmissionStatistics");
        return ResponseEntity.ok(new PlatformSubmissionStatisticsVO());
    }

    @Override
    public ResponseEntity<Map<String, Map<String, Integer>>> getPlatformParticipantTrend() {
        log.warn("[Fallback] registration-service unavailable — getPlatformParticipantTrend");
        return ResponseEntity.ok(Collections.emptyMap());
    }

    @Override
    public ResponseEntity<Map<String, Integer>> getPlatformSubmissionTrend() {
        log.warn("[Fallback] registration-service unavailable — getPlatformSubmissionTrend");
        return ResponseEntity.ok(Collections.emptyMap());
    }

    @Override
    public ResponseEntity<Void> updateTotalScore(String submissionId, java.math.BigDecimal totalScore) {
        log.error("[Fallback] registration-service unavailable — updateTotalScore submissionId={}", submissionId);
        return ResponseEntity.ok().build();
    }

    @Override
    public ResponseEntity<SubmissionScoreStatisticsVO> getScoreStatistics(String competitionId) {
        log.warn("[Fallback] registration-service unavailable — getScoreStatistics");
        return ResponseEntity.ok(new SubmissionScoreStatisticsVO());
    }

    @Override
    public ResponseEntity<SubmissionInfoVO> getMySubmissionBasic(String competitionId, String userId) {
        log.warn("[Fallback] registration-service unavailable — getMySubmissionBasic");
        return ResponseEntity.ok(null);
    }

    @Override
    public ResponseEntity<SubmissionInfoVO> getTeamSubmissionBasic(String competitionId, String teamId) {
        log.warn("[Fallback] registration-service unavailable — getTeamSubmissionBasic");
        return ResponseEntity.ok(null);
    }

    @Override
    public ResponseEntity<List<SubmissionInfoVO>> getScoredSubmissions(String competitionId) {
        log.warn("[Fallback] registration-service unavailable — getScoredSubmissions");
        return ResponseEntity.ok(Collections.emptyList());
    }

    @Override
    public ResponseEntity<List<SubmissionInfoVO>> getSubmissionsByIds(List<String> submissionIds) {
        log.warn("[Fallback] registration-service unavailable — getSubmissionsByIds");
        return ResponseEntity.ok(Collections.emptyList());
    }
}
