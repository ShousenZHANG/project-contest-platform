package com.w16a.danish.judge.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.judge.domain.vo.ScoredSubmissionVO;
import com.w16a.danish.judge.domain.vo.AwardEligibilityVO;
import com.w16a.danish.judge.domain.vo.WinnerInfoVO;
import com.w16a.danish.judge.service.ISubmissionWinnersService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test class for {@link SubmissionWinnersController}.
 * Covers winner awarding, public winner listing, and scored submission listing.
 * Author: Eddy Zhang
 * Date: 2025/04/27
 */
@SpringBootTest
@AutoConfigureMockMvc
class SubmissionWinnersControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ISubmissionWinnersService winnersService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("✅ Auto award winners successfully")
    void testAutoAward() throws Exception {
        // Arrange
        doNothing().when(winnersService).autoAward(any(RequestContext.class), anyString());

        // Act & Assert
        mockMvc.perform(post("/winners/auto-award")
                        .header("User-ID", "organizer-id")
                        .header("User-Role", "ORGANIZER")
                        .param("competitionId", "comp-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("Auto awarding completed successfully."));
    }

    @Test
    @DisplayName("✅ Publicly list winners successfully")
    void testListPublicWinners() throws Exception {
        // Arrange
        when(winnersService.listPublicWinners(anyString(), anyInt(), anyInt()))
                .thenReturn(new PageResponse<WinnerInfoVO>());

        // Act & Assert
        mockMvc.perform(get("/winners/public-list")
                        .param("competitionId", "comp-123")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("✅ List scored submissions successfully")
    void testListScoredSubmissions() throws Exception {
        // Arrange
        when(winnersService.listScoredSubmissions(any(RequestContext.class), anyString(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageResponse<ScoredSubmissionVO>());

        // Act & Assert
        mockMvc.perform(get("/winners/scored-list")
                        .header("User-ID", "organizer-id")
                        .header("User-Role", "ORGANIZER")
                        .param("competitionId", "comp-123")
                        .param("keyword", "AI Project")
                        .param("sortBy", "totalScore")
                        .param("order", "desc")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    void eligibilityContractIncludesUnscoredApprovedWorksAndBlockingReasons() throws Exception {
        var submission = new ScoredSubmissionVO();
        submission.setSubmissionId("s"); submission.setReviewStatus("APPROVED");
        submission.setJudgeCount(0); submission.setMinimumJudgeCount(3); submission.setEligible(false);
        submission.setBlockers(List.of("Needs at least 3 valid assigned Judges; currently 0."));
        var eligibility = new AwardEligibilityVO();
        eligibility.setCompetitionId("c"); eligibility.setStatus("COMPLETED"); eligibility.setCanAward(false);
        eligibility.setIsPublic(false);
        eligibility.setMinimumJudgeCount(3); eligibility.setApprovedCount(1); eligibility.setEligibleCount(0);
        eligibility.setSubmissions(List.of(submission)); eligibility.setBlockers(List.of("Every approved submission needs at least 3 valid assigned Judges."));
        when(winnersService.getAwardEligibility(any(RequestContext.class), eq("c"))).thenReturn(eligibility);
        mockMvc.perform(get("/winners/eligibility").param("competitionId", "c")
                        .header("User-ID", "owner").header("User-Role", "ORGANIZER"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.canAward").value(false))
                .andExpect(jsonPath("$.minimumJudgeCount").value(3))
                .andExpect(jsonPath("$.isPublic").value(false))
                .andExpect(jsonPath("$.submissions[0].judgeCount").value(0))
                .andExpect(jsonPath("$.submissions[0].totalScore").isEmpty())
                .andExpect(jsonPath("$.submissions[0].blockers[0]").exists());
    }

    @Test void managedWinnersTakeTrustedIdentityAndPagination() throws Exception {
        when(winnersService.listManagedWinners(any(), eq("c"), eq(1), eq(10))).thenReturn(new PageResponse<WinnerInfoVO>());
        mockMvc.perform(get("/winners/list").param("competitionId", "c")
                .header("User-ID", "owner").header("User-Role", "ORGANIZER"))
                .andExpect(status().isOk());
        verify(winnersService).listManagedWinners(new RequestContext("owner", "ORGANIZER"), "c", 1, 10);
    }

    @Test void managedWinnersRequireAuthentication() throws Exception {
        mockMvc.perform(get("/winners/list").param("competitionId", "c"))
                .andExpect(status().isUnauthorized());
    }
}
