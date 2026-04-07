package com.w16a.danish.registration.feign.fallback;

import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.registration.domain.vo.TeamInfoVO;
import com.w16a.danish.registration.feign.UserServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class UserServiceClientFallback implements UserServiceClient {

    @Override
    public ResponseEntity<List<UserBriefVO>> getUsersByIds(List<String> userIds, String role) {
        log.warn("[Fallback] user-service unavailable — getUsersByIds returning empty list");
        return ResponseEntity.ok(Collections.emptyList());
    }

    @Override
    public ResponseEntity<UserBriefVO> getUserBriefById(String userId) {
        log.warn("[Fallback] user-service unavailable — getUserBriefById userId={}", userId);
        return ResponseEntity.ok(new UserBriefVO());
    }

    @Override
    public ResponseEntity<UserBriefVO> getTeamCreator(String teamId) {
        log.warn("[Fallback] user-service unavailable — getTeamCreator teamId={}", teamId);
        return ResponseEntity.ok(new UserBriefVO());
    }

    @Override
    public ResponseEntity<List<TeamInfoVO>> getTeamBriefByIds(List<String> teamIds) {
        log.warn("[Fallback] user-service unavailable — getTeamBriefByIds returning empty list");
        return ResponseEntity.ok(Collections.emptyList());
    }

    @Override
    public ResponseEntity<Boolean> isUserInTeam(String userId, String teamId) {
        log.warn("[Fallback] user-service unavailable — isUserInTeam returning false");
        return ResponseEntity.ok(false);
    }
}
