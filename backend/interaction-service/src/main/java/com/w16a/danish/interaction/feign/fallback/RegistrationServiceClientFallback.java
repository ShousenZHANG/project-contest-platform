package com.w16a.danish.interaction.feign.fallback;

import com.w16a.danish.interaction.feign.RegistrationServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class RegistrationServiceClientFallback implements RegistrationServiceClient {

    @Override
    public Boolean isUserOrganizerOfSubmission(String submissionId, String userId) {
        log.warn("[Fallback] registration-service unavailable — isUserOrganizerOfSubmission returning false");
        return false;
    }
}
