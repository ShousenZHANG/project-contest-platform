package com.w16a.danish.judge.service.impl;

import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.common.domain.enums.ParticipationType;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.judge.domain.vo.*;
import com.w16a.danish.judge.gateway.CompetitionGateway;
import com.w16a.danish.judge.feign.InteractionServiceClient;
import com.w16a.danish.judge.feign.SubmissionServiceClient;
import com.w16a.danish.judge.feign.UserServiceClient;
import com.w16a.danish.judge.service.ICompetitionJudgesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DashboardServiceImplTest {
    private final CompetitionGateway competitions = mock(CompetitionGateway.class);
    private final SubmissionServiceClient submissions = mock(SubmissionServiceClient.class);
    private final InteractionServiceClient interactions = mock(InteractionServiceClient.class);
    private final ICompetitionJudgesService judges = mock(ICompetitionJudgesService.class);
    private final UserServiceClient users = mock(UserServiceClient.class);
    private final DashboardServiceImpl service = new DashboardServiceImpl(competitions, submissions, interactions, judges, users);
    private CompetitionResponseVO competition;

    @BeforeEach void setUp() {
        competition = new CompetitionResponseVO(); competition.setId("c"); competition.setName("Contest");
        competition.setIsPublic(true); competition.setStatus(CompetitionStatus.ONGOING);
        competition.setParticipationType(ParticipationType.INDIVIDUAL);
        when(competitions.require("c")).thenReturn(competition);
        var registration = new RegistrationStatisticsVO(); registration.setIndividualParticipantCount(10); registration.setTeamParticipantCount(5);
        when(submissions.getRegistrationStatistics("c")).thenReturn(ResponseEntity.ok(registration));
        var work = new SubmissionStatisticsVO(); work.setTotalSubmissions(20); work.setApprovedSubmissions(15); work.setPendingSubmissions(5);
        when(submissions.getSubmissionStatistics("c")).thenReturn(ResponseEntity.ok(work));
        var interaction = new InteractionStatisticsVO(); interaction.setVoteCount(100L); interaction.setCommentCount(30L);
        when(interactions.getInteractionStatistics("c")).thenReturn(ResponseEntity.ok(interaction));
        var score = new SubmissionScoreStatisticsVO(); score.setAverageScore(new BigDecimal("8"));
        when(submissions.getScoreStatistics("c")).thenReturn(ResponseEntity.ok(score));
        when(submissions.getParticipantTrend("c")).thenReturn(ResponseEntity.ok(Map.of("individual", Map.of("2026-10", 10))));
        when(submissions.getSubmissionTrend("c")).thenReturn(ResponseEntity.ok(Map.of("2026-10", 5)));
        when(judges.countJudgesByCompetitionId("c")).thenReturn(3);
    }

    @Test void publicStatisticsIgnoreAnySuppliedIdentityAndNeverReadPersonalWorks() {
        var dashboard = service.getCompetitionStatistics("c", "victim");
        assertThat(dashboard.getCompetitionName()).isEqualTo("Contest");
        assertThat(dashboard.getSubmissionCount()).isEqualTo(20);
        assertThat(dashboard.getVoteCount()).isEqualTo(100);
        assertThat(dashboard.getHasSubmitted()).isNull();
        assertThat(dashboard.getMyTotalScore()).isNull();
        assertThat(dashboard.getMyReviewStatus()).isNull();
        verify(submissions, never()).getMySubmissionBasic(anyString(), anyString());
        verify(submissions, never()).getTeamSubmissionsBasic(anyString(), anyList());
        verifyNoInteractions(users);
    }

    @Test void privateOrUnknownVisibilityRejectsPublicReadsBeforeLoadingAnyStatistics() {
        for (Boolean visibility : java.util.Arrays.asList(false, null)) {
            competition.setIsPublic(visibility);
            assertThatThrownBy(() -> service.getCompetitionStatistics("c", "victim"))
                    .isInstanceOf(BusinessException.class)
                    .extracting(error -> ((BusinessException) error).getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        }
        verifyNoInteractions(submissions, interactions, judges, users);
    }

    @Test void authenticatedPublicIndividualReadsOnlyTheCurrentUsersPrivateSubmission() {
        var own = new SubmissionInfoVO(); own.setReviewStatus("PENDING"); own.setTotalScore(new BigDecimal("8.80"));
        when(submissions.getMySubmissionBasic("c", "self")).thenReturn(ResponseEntity.ok(own));
        var dashboard = service.getManagedCompetitionStatistics(new RequestContext("self", "PARTICIPANT"), "c");
        assertThat(dashboard.getHasSubmitted()).isTrue();
        assertThat(dashboard.getMyReviewStatus()).isEqualTo("PENDING");
        assertThat(dashboard.getMyTotalScore()).isEqualByComparingTo("8.80");
        verify(submissions).getMySubmissionBasic("c", "self");
    }

    @Test void authenticatedTeamReadsOnlyTheCurrentUsersTeamsInOneBatch() {
        competition.setParticipationType(ParticipationType.TEAM);
        when(users.getJoinedTeamIdsByUser("self")).thenReturn(ResponseEntity.ok(List.of("t1", "t2")));
        var own = new SubmissionInfoVO(); own.setReviewStatus("REJECTED");
        when(submissions.getTeamSubmissionsBasic("c", List.of("t1", "t2"))).thenReturn(ResponseEntity.ok(List.of(own)));
        var dashboard = service.getManagedCompetitionStatistics(new RequestContext("self", "PARTICIPANT"), "c");
        assertThat(dashboard.getHasSubmitted()).isTrue();
        assertThat(dashboard.getMyReviewStatus()).isEqualTo("REJECTED");
        verify(submissions, never()).getTeamSubmissionBasic(anyString(), anyString());
    }

    @Test void privateStatisticsRequireActualOrganizerOrAdmin() {
        competition.setIsPublic(false);
        when(competitions.isOrganiser("c", "owner")).thenReturn(true);
        when(submissions.getMySubmissionBasic(anyString(), anyString())).thenReturn(ResponseEntity.ok(null));
        assertThat(service.getManagedCompetitionStatistics(new RequestContext("owner", "ORGANIZER"), "c").getHasSubmitted()).isFalse();
        assertThat(service.getManagedCompetitionStatistics(new RequestContext("admin", "ADMIN"), "c").getCompetitionName()).isEqualTo("Contest");
        assertThatThrownBy(() -> service.getManagedCompetitionStatistics(new RequestContext("stranger", "ORGANIZER"), "c"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Only competition organizers");
        assertThatThrownBy(() -> service.getManagedCompetitionStatistics(new RequestContext("owner", "PARTICIPANT"), "c"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Only competition organizers");
    }

    @Test void missingCompetitionFailsBeforeReadingAggregates() {
        when(competitions.require("c")).thenThrow(new BusinessException(HttpStatus.NOT_FOUND, "Competition not found"));
        assertThatThrownBy(() -> service.getCompetitionStatistics("c", "victim")).hasMessageContaining("Competition not found");
        verifyNoInteractions(submissions, interactions, judges, users);
    }

    @Test void unavailableOrMalformedAggregateResponseIsNotPublishedAsZeroStatistics() {
        when(submissions.getSubmissionStatistics("c")).thenReturn(null);
        assertThatThrownBy(() -> service.getCompetitionStatistics("c", null))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        when(submissions.getSubmissionStatistics("c")).thenReturn(ResponseEntity.ok(null));
        assertThatThrownBy(() -> service.getCompetitionStatistics("c", null)).hasMessageContaining("returned no data");
        verifyNoInteractions(interactions, judges, users);
    }

    @Test void platformCompetitionTotalsExcludePrivateAndUnknownVisibility() {
        var privateCompetition = new CompetitionResponseVO(); privateCompetition.setIsPublic(false);
        var awarded = new CompetitionResponseVO(); awarded.setIsPublic(true); awarded.setParticipationType(ParticipationType.TEAM); awarded.setStatus(CompetitionStatus.AWARDED);
        when(competitions.listAll()).thenReturn(List.of(competition, privateCompetition, awarded));
        when(submissions.getPlatformParticipantStatistics()).thenReturn(ResponseEntity.ok(new PlatformParticipantStatisticsVO()));
        when(submissions.getPlatformSubmissionStatistics()).thenReturn(ResponseEntity.ok(new PlatformSubmissionStatisticsVO()));
        when(interactions.getPlatformInteractionStatistics()).thenReturn(ResponseEntity.ok(new InteractionStatisticsVO()));
        when(submissions.getPlatformParticipantTrend()).thenReturn(ResponseEntity.ok(Map.of()));
        when(submissions.getPlatformSubmissionTrend()).thenReturn(ResponseEntity.ok(Map.of()));
        var dashboard = service.getPlatformDashboard();
        assertThat(dashboard.getTotalCompetitions()).isEqualTo(2);
        assertThat(dashboard.getActiveCompetitions()).isEqualTo(1);
        assertThat(dashboard.getFinishedCompetitions()).isEqualTo(1);
        assertThat(dashboard.getIndividualCompetitions()).isEqualTo(1);
        assertThat(dashboard.getTeamCompetitions()).isEqualTo(1);
    }
}
