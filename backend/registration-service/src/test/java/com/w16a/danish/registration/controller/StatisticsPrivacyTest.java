package com.w16a.danish.registration.controller;

import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.exception.GlobalExceptionHandler;
import com.w16a.danish.common.security.ServiceAuthorizationInterceptor;
import com.w16a.danish.common.security.ServiceTokenService;
import com.w16a.danish.registration.domain.vo.RegistrationStatisticsVO;
import com.w16a.danish.registration.domain.vo.SubmissionStatisticsVO;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.service.ICompetitionParticipantsService;
import com.w16a.danish.registration.service.IParticipantAnalyticsService;
import com.w16a.danish.registration.service.ISubmissionAnalyticsService;
import com.w16a.danish.registration.service.ISubmissionRecordsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class StatisticsPrivacyTest {
    private static final String SECRET = "statistics-service-test-secret-00000001";
    private static final String[] PUBLIC = {"/registrations/public/c1/statistics",
            "/registrations/public/c1/participant-trend", "/submissions/statistics?competitionId=c1",
            "/submissions/public/c1/submission-trend"};
    private CompetitionGateway competitions;
    private CompetitionResponseVO competition;
    private IParticipantAnalyticsService participants;
    private ISubmissionAnalyticsService submissions;
    private MockMvc mvc;
    private ServiceTokenService tokens;

    @BeforeEach
    void setUp() {
        competitions = mock(CompetitionGateway.class);
        participants = mock(IParticipantAnalyticsService.class);
        submissions = mock(ISubmissionAnalyticsService.class);
        competition = new CompetitionResponseVO();
        competition.setIsPublic(false);
        when(competitions.require("c1")).thenReturn(competition);
        tokens = new ServiceTokenService(SECRET, "different-browser-secret");
        mvc = MockMvcBuilders.standaloneSetup(
                new CompetitionParticipantsController(mock(ICompetitionParticipantsService.class), participants, competitions),
                new SubmissionRecordsController(mock(ISubmissionRecordsService.class), submissions, competitions))
                .setControllerAdvice(new GlobalExceptionHandler())
                .addInterceptors(new ServiceAuthorizationInterceptor(tokens, "registration-service")).build();
    }

    @ParameterizedTest
    @ValueSource(booleans = {false})
    @NullSource
    void privateOrUnknownVisibilityCannotExposeCountsThroughAnyPublicAggregate(Boolean isPublic) throws Exception {
        competition.setIsPublic(isPublic);
        for (String route : PUBLIC) {
            mvc.perform(get(route)).andExpect(status().isNotFound());
            mvc.perform(get(route).header("User-ID", "admin").header("User-Role", "ADMIN"))
                    .andExpect(status().isNotFound());
        }
        verifyNoInteractions(participants, submissions);
    }

    @ParameterizedTest
    @ValueSource(strings = {"registration-statistics", "participant-trend", "submission-statistics", "submission-trend"})
    void publicCompetitionsKeepTheirExistingAggregateShape(String report) throws Exception {
        competition.setIsPublic(true);
        seedReport(report);
        mvc.perform(get(publicRoute(report))).andExpect(status().isOk()).andExpect(jsonPath(expectedField(report)).value(3));
        verifyReport(report);
        verify(competitions).require("c1");
    }

    @ParameterizedTest
    @ValueSource(strings = {"registration-statistics", "participant-trend", "submission-statistics", "submission-trend"})
    void judgeServiceCanReadPrivateAggregatesUsingTheExplicitInternalReadContract(String report) throws Exception {
        seedReport(report);
        mvc.perform(get(internalRoute(report)).header(ServiceTokenService.HEADER,
                        tokens.issue("judge-service", "registration-service", "internal:read")))
                .andExpect(status().isOk()).andExpect(jsonPath(expectedField(report)).value(3));
        verifyReport(report);
        // Internal callers already carry the trusted service scope; no public visibility filter applies.
        verifyNoInteractions(competitions);
    }

    @ParameterizedTest
    @ValueSource(strings = {"registration-statistics", "participant-trend", "submission-statistics", "submission-trend"})
    void unsignedBrowserAndWrongCallerCannotReadInternalAggregates(String report) throws Exception {
        mvc.perform(get(internalRoute(report)).header("User-ID", "admin").header("User-Role", "ADMIN"))
                .andExpect(status().isForbidden());
        mvc.perform(get(internalRoute(report)).header(ServiceTokenService.HEADER,
                        tokens.issue("user-service", "registration-service", "internal:read")))
                .andExpect(status().isForbidden());
        mvc.perform(get(internalRoute(report)).header(ServiceTokenService.HEADER,
                        tokens.issue("judge-service", "registration-service", "internal:write")))
                .andExpect(status().isForbidden());
        mvc.perform(get(internalRoute(report)).header(ServiceTokenService.HEADER,
                        tokens.issue("judge-service", "competition-service", "internal:read")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(participants, submissions, competitions);
    }

    private void seedReport(String report) {
        switch (report) {
            case "registration-statistics" -> {
                var statistics = new RegistrationStatisticsVO();
                statistics.setCompetitionId("c1");
                statistics.setIndividualParticipantCount(1);
                statistics.setTeamParticipantCount(2);
                statistics.setTotalRegistrations(3);
                when(participants.getRegistrationStatistics("c1")).thenReturn(statistics);
            }
            case "participant-trend" -> when(participants.getParticipantTrend("c1"))
                    .thenReturn(Map.of("individual", Map.of("2026-10-04", 3), "team", Map.of()));
            case "submission-statistics" -> {
                var statistics = new SubmissionStatisticsVO();
                statistics.setTotalSubmissions(3);
                when(submissions.getSubmissionStatistics("c1")).thenReturn(statistics);
            }
            case "submission-trend" -> when(submissions.getSubmissionTrend("c1")).thenReturn(Map.of("2026-10-04", 3));
            default -> throw new IllegalArgumentException(report);
        }
    }

    private void verifyReport(String report) {
        switch (report) {
            case "registration-statistics" -> verify(participants).getRegistrationStatistics("c1");
            case "participant-trend" -> verify(participants).getParticipantTrend("c1");
            case "submission-statistics" -> verify(submissions).getSubmissionStatistics("c1");
            case "submission-trend" -> verify(submissions).getSubmissionTrend("c1");
            default -> throw new IllegalArgumentException(report);
        }
    }

    private static String expectedField(String report) {
        return switch (report) {
            case "registration-statistics" -> "$.totalRegistrations";
            case "participant-trend" -> "$.individual['2026-10-04']";
            case "submission-statistics" -> "$.totalSubmissions";
            case "submission-trend" -> "$['2026-10-04']";
            default -> throw new IllegalArgumentException(report);
        };
    }

    private static String publicRoute(String report) {
        return switch (report) {
            case "registration-statistics" -> PUBLIC[0];
            case "participant-trend" -> PUBLIC[1];
            case "submission-statistics" -> PUBLIC[2];
            case "submission-trend" -> PUBLIC[3];
            default -> throw new IllegalArgumentException(report);
        };
    }

    private static String internalRoute(String report) {
        return switch (report) {
            case "registration-statistics" -> "/registrations/internal/c1/statistics";
            case "participant-trend" -> "/registrations/internal/c1/participant-trend";
            case "submission-statistics" -> "/submissions/internal/c1/statistics";
            case "submission-trend" -> "/submissions/internal/c1/submission-trend";
            default -> throw new IllegalArgumentException(report);
        };
    }
}
