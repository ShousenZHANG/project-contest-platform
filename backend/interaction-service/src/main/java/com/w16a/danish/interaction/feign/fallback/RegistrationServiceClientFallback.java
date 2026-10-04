package com.w16a.danish.interaction.feign.fallback;

import com.w16a.danish.interaction.feign.RegistrationServiceClient;
import org.springframework.stereotype.Component;

@Component
public class RegistrationServiceClientFallback implements RegistrationServiceClient {

    @Override
    public Boolean isPublicApproved(String submissionId) {
        throw new com.w16a.danish.common.exception.ServiceUnavailableException("registration-service", "isPublicApproved");
    }

    @Override
    public Boolean isUserOrganizerOfSubmission(String submissionId, String userId) {
        throw new com.w16a.danish.common.exception.ServiceUnavailableException("registration-service", "isUserOrganizerOfSubmission");
    }
}
