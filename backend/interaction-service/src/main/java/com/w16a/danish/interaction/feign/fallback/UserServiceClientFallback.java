package com.w16a.danish.interaction.feign.fallback;

import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.interaction.feign.UserServiceClient;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class UserServiceClientFallback implements UserServiceClient {

    @Override
    public ResponseEntity<List<UserBriefVO>> getUsersByIds(List<String> userIds, String role) {
        throw new com.w16a.danish.common.exception.ServiceUnavailableException("user-service", "getUsersByIds");
    }
}
