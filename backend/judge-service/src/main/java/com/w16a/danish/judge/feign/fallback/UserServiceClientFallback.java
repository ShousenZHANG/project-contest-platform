package com.w16a.danish.judge.feign.fallback;

import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.judge.domain.vo.TeamInfoVO;
import com.w16a.danish.judge.feign.UserServiceClient;
import com.w16a.danish.common.exception.ServiceUnavailableException;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class UserServiceClientFallback implements UserServiceClient {

    @Override
    public ResponseEntity<List<UserBriefVO>> getUsersByIds(List<String> userIds, String role) {
        throw new ServiceUnavailableException("user-service", "getUsersByIds");
    }

    @Override
    public ResponseEntity<UserBriefVO> getUserBriefById(String userId) {
        throw new ServiceUnavailableException("user-service", "getUserBriefById");
    }

    @Override
    public ResponseEntity<List<UserBriefVO>> getTeamMembersByTeamId(String teamId) {
        throw new ServiceUnavailableException("user-service", "getTeamMembersByTeamId");
    }

    @Override
    public ResponseEntity<List<TeamInfoVO>> getTeamBriefByIds(List<String> teamIds) {
        throw new ServiceUnavailableException("user-service", "getTeamBriefByIds");
    }

    @Override
    public ResponseEntity<List<String>> getJoinedTeamIdsByUser(String userId) {
        throw new ServiceUnavailableException("user-service", "getJoinedTeamIdsByUser");
    }
}
