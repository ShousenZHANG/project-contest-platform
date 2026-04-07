package com.w16a.danish.user.feign.fallback;

import com.w16a.danish.user.feign.SubmissionServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class SubmissionServiceClientFallback implements SubmissionServiceClient {

    @Override
    public ResponseEntity<Boolean> existsByTeamId(String teamId) {
        log.warn("[Fallback] registration-service unavailable — existsByTeamId returning false");
        return ResponseEntity.ok(false);
    }

    @Override
    public ResponseEntity<Boolean> existsRegistrationByTeamId(String teamId) {
        log.warn("[Fallback] registration-service unavailable — existsRegistrationByTeamId returning false");
        return ResponseEntity.ok(false);
    }
}
