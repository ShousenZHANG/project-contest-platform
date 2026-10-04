package com.w16a.danish.judge.feign.fallback;

import com.w16a.danish.judge.domain.vo.*;
import com.w16a.danish.judge.feign.SubmissionServiceClient;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import com.w16a.danish.common.exception.ServiceUnavailableException;

@Component
public class SubmissionServiceClientFallback implements SubmissionServiceClient {

    @Override
    public ResponseEntity<List<SubmissionInfoVO>> getApprovedSubmissions(String competitionId) {
        throw new ServiceUnavailableException("registration-service", "getApprovedSubmissions");
    }

    @Override
    public ResponseEntity<RegistrationStatisticsVO> getRegistrationStatistics(String competitionId) {
        throw new ServiceUnavailableException("registration-service", "getRegistrationStatistics");
    }

    @Override
    public ResponseEntity<SubmissionStatisticsVO> getSubmissionStatistics(String competitionId) {
        throw new ServiceUnavailableException("registration-service", "getSubmissionStatistics");
    }

    @Override
    public ResponseEntity<Map<String, Map<String, Integer>>> getParticipantTrend(String competitionId) {
        throw new ServiceUnavailableException("registration-service", "getParticipantTrend");
    }

    @Override
    public ResponseEntity<Map<String, Integer>> getSubmissionTrend(String competitionId) {
        throw new ServiceUnavailableException("registration-service", "getSubmissionTrend");
    }

    @Override
    public ResponseEntity<PlatformParticipantStatisticsVO> getPlatformParticipantStatistics() {
        throw new ServiceUnavailableException("registration-service", "getPlatformParticipantStatistics");
    }

    @Override
    public ResponseEntity<PlatformSubmissionStatisticsVO> getPlatformSubmissionStatistics() {
        throw new ServiceUnavailableException("registration-service", "getPlatformSubmissionStatistics");
    }

    @Override
    public ResponseEntity<Map<String, Map<String, Integer>>> getPlatformParticipantTrend() {
        throw new ServiceUnavailableException("registration-service", "getPlatformParticipantTrend");
    }

    @Override
    public ResponseEntity<Map<String, Integer>> getPlatformSubmissionTrend() {
        throw new ServiceUnavailableException("registration-service", "getPlatformSubmissionTrend");
    }

    @Override
    public ResponseEntity<Void> updateTotalScore(String submissionId, java.math.BigDecimal totalScore, long version, int revision) {
        throw new ServiceUnavailableException("registration-service", "updateTotalScore");
    }

    @Override
    public ResponseEntity<SubmissionScoreStatisticsVO> getScoreStatistics(String competitionId) {
        throw new ServiceUnavailableException("registration-service", "getScoreStatistics");
    }

    @Override
    public ResponseEntity<SubmissionInfoVO> getMySubmissionBasic(String competitionId, String userId) {
        throw new ServiceUnavailableException("registration-service", "getMySubmissionBasic");
    }

    @Override
    public ResponseEntity<SubmissionInfoVO> getTeamSubmissionBasic(String competitionId, String teamId) {
        throw new ServiceUnavailableException("registration-service", "getTeamSubmissionBasic");
    }

    @Override
    public ResponseEntity<List<SubmissionInfoVO>> getTeamSubmissionsBasic(String competitionId, List<String> teamIds) {
        throw new ServiceUnavailableException("registration-service", "getTeamSubmissionsBasic");
    }

    @Override
    public ResponseEntity<List<SubmissionInfoVO>> getSubmissionsByIds(List<String> submissionIds) {
        throw new ServiceUnavailableException("registration-service", "getSubmissionsByIds");
    }
}
