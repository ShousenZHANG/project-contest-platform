package com.w16a.danish.registration.feign.fallback;

import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.common.exception.ServiceUnavailableException;
import com.w16a.danish.registration.domain.vo.TeamInfoVO;
import com.w16a.danish.registration.feign.UserServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
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
    public ResponseEntity<UserBriefVO> getTeamCreator(String teamId) {
        throw new ServiceUnavailableException("user-service", "getTeamCreator");
    }

    @Override
    public ResponseEntity<List<TeamInfoVO>> getTeamBriefByIds(List<String> teamIds) {
        throw new ServiceUnavailableException("user-service", "getTeamBriefByIds");
    }

    @Override
    public ResponseEntity<Boolean> isUserInTeam(String userId, String teamId) {
        throw new ServiceUnavailableException("user-service", "isUserInTeam");
    }
}
