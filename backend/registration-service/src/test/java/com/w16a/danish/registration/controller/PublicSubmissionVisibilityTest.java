package com.w16a.danish.registration.controller;

import com.w16a.danish.common.exception.GlobalExceptionHandler;
import com.w16a.danish.common.security.ServiceAuthorizationInterceptor;
import com.w16a.danish.common.security.ServiceTokenService;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.service.ISubmissionAnalyticsService;
import com.w16a.danish.registration.service.ISubmissionRecordsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PublicSubmissionVisibilityTest {
    private ISubmissionRecordsService submissions;
    private MockMvc mvc;
    private ServiceTokenService tokens;

    @BeforeEach
    void setUp() {
        submissions = mock(ISubmissionRecordsService.class);
        tokens = new ServiceTokenService("visibility-service-test-secret-00000001", "different-user-secret");
        mvc = MockMvcBuilders.standaloneSetup(new SubmissionRecordsController(submissions,
                        mock(ISubmissionAnalyticsService.class), mock(CompetitionGateway.class)))
                .setControllerAdvice(new GlobalExceptionHandler())
                .addInterceptors(new ServiceAuthorizationInterceptor(tokens, "registration-service")).build();
    }

    @Test
    void onlyInteractionServiceCanUseTheVisibilityDecision() throws Exception {
        when(submissions.isPublicApproved("s1")).thenReturn(true);
        String path = "/submissions/internal/public-approved?submissionId=s1";
        mvc.perform(get(path).header(ServiceTokenService.HEADER,
                        tokens.issue("interaction-service", "registration-service", "internal:read")))
                .andExpect(status().isOk()).andExpect(content().string("true"));
        clearInvocations(submissions);
        mvc.perform(get(path).header("User-ID", "admin").header("User-Role", "ADMIN")).andExpect(status().isForbidden());
        mvc.perform(get(path).header(ServiceTokenService.HEADER,
                        tokens.issue("judge-service", "registration-service", "internal:read"))).andExpect(status().isForbidden());
        verifyNoInteractions(submissions);
    }

    @Test
    void thePublicOrganizerLookupCannotProbeAPrivateOrUnapprovedSubmission() throws Exception {
        mvc.perform(get("/submissions/is-organizer").param("submissionId", "private").param("userId", "u1"))
                .andExpect(status().isNotFound());
        verify(submissions, never()).isUserOrganizerOfSubmission(anyString(), anyString());
    }
}
