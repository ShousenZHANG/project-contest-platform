package com.w16a.danish.competition.feign;

import com.w16a.danish.common.domain.vo.UserBriefVO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Feign client for communicating with user-service.
 * Used to fetch user brief info by IDs, emails, and roles.
 *
 * @author Eddy
 * @since 2025/04/04
 */
@FeignClient(name = "user-service", configuration = com.w16a.danish.common.security.InternalFeignConfiguration.class, fallback = com.w16a.danish.competition.feign.fallback.UserServiceClientFallback.class)
public interface UserServiceClient {

    @PostMapping("/users/internal/query-by-emails")
    ResponseEntity<List<UserBriefVO>> getUsersByEmails(
            @RequestBody List<String> emails
    );

    @PostMapping("/users/internal/query-by-ids")
    ResponseEntity<List<UserBriefVO>> getUsersByIds(
            @RequestBody List<String> userIds,
            @RequestParam(required = false) String role
    );

    /**
     * Query a single user by user ID.
     */
    @GetMapping("/users/internal/{userId}")
    ResponseEntity<UserBriefVO> getUserBriefById(@PathVariable("userId") String userId);

}
