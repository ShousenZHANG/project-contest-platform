package com.w16a.danish.judge.feign.fallback;

import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.judge.domain.vo.TeamInfoVO;
import com.w16a.danish.judge.feign.UserServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class UserServiceClientFallback implements UserServiceClient {

    @Override
    public ResponseEntity<List<UserBriefVO>> getUsersByEmails(List<String> emails) {
        log.warn("[Fallback] user-service unavailable — getUsersByEmails returning empty list");
        return ResponseEntity.ok(Collections.emptyList());
    }

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
    public ResponseEntity<List<UserBriefVO>> getTeamMembersByTeamId(String teamId) {
        log.warn("[Fallback] user-service unavailable — getTeamMembersByTeamId returning empty list");
        return ResponseEntity.ok(Collections.emptyList());
    }

    @Override
    public ResponseEntity<List<TeamInfoVO>> getTeamBriefByIds(List<String> teamIds) {
        log.warn("[Fallback] user-service unavailable — getTeamBriefByIds returning empty list");
        return ResponseEntity.ok(Collections.emptyList());
    }

    @Override
    public ResponseEntity<List<String>> getJoinedTeamIdsByUser(String userId) {
        log.warn("[Fallback] user-service unavailable — getJoinedTeamIdsByUser returning empty list");
        return ResponseEntity.ok(Collections.emptyList());
    }
}
