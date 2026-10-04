package com.w16a.danish.interaction.controller;

import com.w16a.danish.common.exception.GlobalExceptionHandler;
import com.w16a.danish.common.security.ServiceAuthorizationInterceptor;
import com.w16a.danish.common.security.ServiceTokenService;
import com.w16a.danish.interaction.service.ISubmissionCommentsService;
import com.w16a.danish.interaction.service.ISubmissionVotesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class InteractionStatisticsSecurityTest {
    private ISubmissionCommentsService comments;
    private ISubmissionVotesService votes;
    private MockMvc mvc;
    private ServiceTokenService tokens;

    @BeforeEach
    void setUp() {
        comments = mock(ISubmissionCommentsService.class);
        votes = mock(ISubmissionVotesService.class);
        tokens = new ServiceTokenService("interaction-internal-test-secret-000001", "different-user-secret");
        mvc = MockMvcBuilders.standaloneSetup(new SubmissionInteractionController(comments, votes))
                .setControllerAdvice(new GlobalExceptionHandler())
                .addInterceptors(new ServiceAuthorizationInterceptor(tokens, "interaction-service")).build();
    }

    @Test
    void trustedJudgeReadsAnActualCompetitionAggregateInsteadOfASubmissionAggregate() throws Exception {
        when(votes.countCompetitionVotes("c1")).thenReturn(7L);
        when(comments.countCompetitionComments("c1")).thenReturn(9L);
        mvc.perform(get("/interactions/internal/competition-statistics").param("competitionId", "c1")
                        .header(ServiceTokenService.HEADER, tokens.issue("judge-service", "interaction-service", "internal:read")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.voteCount").value(7))
                .andExpect(jsonPath("$.commentCount").value(9));
        verify(votes).countCompetitionVotes("c1");
        verify(comments).countCompetitionComments("c1");
        verify(votes, never()).countVotes(anyString());
        verify(comments, never()).countComments(anyString());
    }

    @Test
    void browserHeadersWrongCallerAndWrongScopeCannotReadCompetitionAnalytics() throws Exception {
        String path = "/interactions/internal/competition-statistics?competitionId=private";
        mvc.perform(get(path).header("User-ID", "admin").header("User-Role", "ADMIN")).andExpect(status().isForbidden());
        mvc.perform(get(path).header(ServiceTokenService.HEADER, tokens.issue("registration-service", "interaction-service", "internal:read")))
                .andExpect(status().isForbidden());
        mvc.perform(get(path).header(ServiceTokenService.HEADER, tokens.issue("judge-service", "interaction-service", "internal:write")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(votes, comments);
    }
}
