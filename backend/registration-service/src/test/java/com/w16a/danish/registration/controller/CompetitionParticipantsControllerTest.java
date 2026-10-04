package com.w16a.danish.registration.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.security.ServiceTokenService;
import com.w16a.danish.registration.domain.vo.*;
import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.registration.service.ICompetitionParticipantsService;
import com.w16a.danish.registration.service.IParticipantAnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * ✅ Unit tests for CompetitionParticipantsController.
 * Focus on verifying API endpoints behavior without real database access.
 */
@SpringBootTest(properties = "service.auth.secret=test-service-secret-at-least-32-characters")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CompetitionParticipantsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ServiceTokenService tokens;

    @MockitoBean
    private ICompetitionParticipantsService participantsService;

    @MockitoBean
    private IParticipantAnalyticsService participantAnalyticsService;

    @MockitoBean
    private com.w16a.danish.registration.gateway.CompetitionGateway competitionGateway;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        var competition = new com.w16a.danish.common.domain.vo.CompetitionResponseVO();
        competition.setIsPublic(true);
        when(competitionGateway.require(anyString())).thenReturn(competition);
    }

    @Test
    @DisplayName("✅ Register for competition successfully")
    void testRegisterForCompetition() throws Exception {
        doNothing().when(participantsService).register(any(), any(RequestContext.class));

        mockMvc.perform(post("/registrations/{competitionId}", "comp-1")
                        .header("User-ID", "user-1")
                        .header("User-Role", "PARTICIPANT"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("✅ Cancel registration successfully")
    void testCancelRegistration() throws Exception {
        doNothing().when(participantsService).cancelRegistration(any(), any(RequestContext.class));

        mockMvc.perform(delete("/registrations/{competitionId}", "comp-1")
                        .header("User-ID", "user-1")
                        .header("User-Role", "PARTICIPANT"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("✅ List participants successfully")
    void testListParticipantsByCompetition() throws Exception {
        when(participantsService.getParticipantsByCompetitionWithSearch(any(), any(RequestContext.class), anyInt(), anyInt(), any(), any(), any()))
                .thenReturn(PageResponse.<ParticipantInfoVO>builder()
                        .page(1).size(10).total(1L).pages(1)
                        .data(List.of(new ParticipantInfoVO()))
                        .build());

        mockMvc.perform(get("/registrations/{competitionId}/participants", "comp-1")
                        .header("User-ID", "organizer-1")
                        .header("User-Role", "ORGANIZER")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("✅ Cancel participant by organizer successfully")
    void testCancelParticipantByOrganizer() throws Exception {
        doNothing().when(participantsService).cancelByOrganizer(any(), any(), any(RequestContext.class));

        mockMvc.perform(delete("/registrations/{competitionId}/participants/{participantUserId}", "comp-1", "user-2")
                        .header("User-ID", "organizer-1")
                        .header("User-Role", "ORGANIZER"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("✅ Check registration status successfully")
    void testIsRegistered() throws Exception {
        when(participantsService.isRegistered(any(), any(RequestContext.class))).thenReturn(true);

        mockMvc.perform(get("/registrations/{competitionId}/status", "comp-1")
                        .header("User-ID", "user-1")
                        .header("User-Role", "PARTICIPANT"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    @DisplayName("✅ Get competitions user registered successfully")
    void testGetMyCompetitions() throws Exception {
        when(participantsService.getMyCompetitionsWithSearch(any(RequestContext.class), anyInt(), anyInt(), any(), any(), any()))
                .thenReturn(PageResponse.<CompetitionParticipationVO>builder()
                        .page(1).size(10).total(1L).pages(1)
                        .data(List.of(new CompetitionParticipationVO()))
                        .build());

        mockMvc.perform(get("/registrations/my")
                        .header("User-ID", "user-1")
                        .header("User-Role", "PARTICIPANT")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("✅ Register a team successfully")
    void testRegisterTeam() throws Exception {
        doNothing().when(participantsService).registerTeam(any(), any(), any(RequestContext.class));

        mockMvc.perform(post("/registrations/teams/{competitionId}/{teamId}", "comp-1", "team-1")
                        .header("User-ID", "user-1")
                        .header("User-Role", "PARTICIPANT"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("✅ Cancel team registration successfully")
    void testCancelTeamRegistration() throws Exception {
        doNothing().when(participantsService).cancelTeamRegistration(any(), any(), any(RequestContext.class));

        mockMvc.perform(delete("/registrations/teams/{competitionId}/{teamId}", "comp-1", "team-1")
                        .header("User-ID", "user-1")
                        .header("User-Role", "PARTICIPANT"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("✅ Check if team is registered successfully")
    void testIsTeamRegistered() throws Exception {
        when(participantsService.isTeamRegistered(any(), any(), any(RequestContext.class))).thenReturn(true);

        mockMvc.perform(get("/registrations/teams/{competitionId}/{teamId}/status", "comp-1", "team-1")
                        .header("User-ID", "user-1").header("User-Role", "PARTICIPANT"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    @DisplayName("✅ List registered teams successfully")
    void testListRegisteredTeams() throws Exception {
        when(participantsService.getTeamsByCompetitionWithSearch(any(), anyInt(), anyInt(), any(), any(), any()))
                .thenReturn(PageResponse.<TeamInfoVO>builder()
                        .page(1).size(10).total(1L).pages(1)
                        .data(List.of(new TeamInfoVO()))
                        .build());

        mockMvc.perform(get("/registrations/public/{competitionId}/teams", "comp-1")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk());
    }

    @Test
    void publicTeamListCannotExposePrivateCompetitionRegistrations() throws Exception {
        var competition = new com.w16a.danish.common.domain.vo.CompetitionResponseVO();
        competition.setIsPublic(false);
        when(competitionGateway.require("comp-1")).thenReturn(competition);
        mockMvc.perform(get("/registrations/public/comp-1/teams"))
                .andExpect(status().isNotFound());
        verifyNoInteractions(participantsService);
    }

    @Test
    void managedTeamListPassesTrustedIdentityAndTheExistingFilters() throws Exception {
        when(participantsService.getManagedTeamsByCompetitionWithSearch(
                "comp-1", new RequestContext("organizer-1", "ORGANIZER"), 2, 25, "robot", "teamName", "asc"))
                .thenReturn(new PageResponse<>(List.of(), 0, 2, 25, 0));
        mockMvc.perform(get("/registrations/teams/list")
                        .header("User-ID", "organizer-1").header("User-Role", "ORGANIZER")
                        .param("competitionId", "comp-1").param("page", "2").param("size", "25")
                        .param("keyword", "robot").param("sortBy", "teamName").param("order", "asc"))
                .andExpect(status().isOk());
        verify(participantsService).getManagedTeamsByCompetitionWithSearch(
                "comp-1", new RequestContext("organizer-1", "ORGANIZER"), 2, 25, "robot", "teamName", "asc");
        verify(participantsService, never()).getTeamsByCompetitionWithSearch(anyString(), anyInt(), anyInt(), any(), any(), any());
    }

    @Test
    void teamPrivateViewsRequireIdentity() throws Exception {
        mockMvc.perform(get("/registrations/teams/team-1/competitions")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/registrations/teams/comp-1/team-1/status")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/registrations/teams/list").param("competitionId", "comp-1"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(participantsService);
    }

    @Test
    @DisplayName("✅ List competitions registered by team successfully")
    void testGetCompetitionsByTeam() throws Exception {
        when(participantsService.getCompetitionsRegisteredByTeam(any(), any(RequestContext.class), anyInt(), anyInt(), any(), any(), any()))
                .thenReturn(PageResponse.<CompetitionParticipationVO>builder()
                        .page(1).size(10).total(1L).pages(1)
                        .data(List.of(new CompetitionParticipationVO()))
                        .build());

        mockMvc.perform(get("/registrations/teams/{teamId}/competitions", "team-1")
                        .header("User-ID", "user-1").header("User-Role", "PARTICIPANT")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("✅ Cancel team registration by organizer successfully")
    void testCancelTeamByOrganizer() throws Exception {
        doNothing().when(participantsService).cancelTeamByOrganizer(any(), any(), any(RequestContext.class));

        mockMvc.perform(delete("/registrations/teams/{competitionId}/team/{teamId}/by-organizer", "comp-1", "team-1")
                        .header("User-ID", "organizer-1")
                        .header("User-Role", "ORGANIZER"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("✅ Check if team has any registration")
    void testExistsRegistrationByTeamId() throws Exception {
        when(participantsService.existsRegistrationByTeamId(any())).thenReturn(true);

        mockMvc.perform(get("/registrations/internal/exists-registration-by-team")
                        .header(ServiceTokenService.HEADER, tokens.issue("user-service", "registration-service-test", "internal:read"))
                        .param("teamId", "team-1"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    @DisplayName("✅ Get registration statistics for competition successfully")
    void testGetRegistrationStatistics() throws Exception {
        when(participantAnalyticsService.getRegistrationStatistics(any()))
                .thenReturn(new RegistrationStatisticsVO());

        mockMvc.perform(get("/registrations/public/{competitionId}/statistics", "comp-1"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("✅ Get participant trend successfully")
    void testGetParticipantTrend() throws Exception {
        when(participantAnalyticsService.getParticipantTrend(any()))
                .thenReturn(Map.of());

        mockMvc.perform(get("/registrations/public/{competitionId}/participant-trend", "comp-1"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("✅ Get platform participant statistics successfully")
    void testGetPlatformParticipantStatistics() throws Exception {
        when(participantAnalyticsService.getPlatformParticipantStatistics())
                .thenReturn(new PlatformParticipantStatisticsVO());

        mockMvc.perform(get("/registrations/public/platform/participant-statistics"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("✅ Get platform participant trend successfully")
    void testGetPlatformParticipantTrend() throws Exception {
        when(participantAnalyticsService.getPlatformParticipantTrend())
                .thenReturn(Map.of());

        mockMvc.perform(get("/registrations/public/platform/participant-trend"))
                .andExpect(status().isOk());
    }
}
