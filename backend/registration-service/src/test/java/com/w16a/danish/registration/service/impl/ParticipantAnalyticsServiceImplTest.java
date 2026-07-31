package com.w16a.danish.registration.service.impl;

import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.domain.po.CompetitionParticipants;
import com.w16a.danish.registration.domain.po.CompetitionTeams;
import com.w16a.danish.registration.domain.vo.PlatformParticipantStatisticsVO;
import com.w16a.danish.registration.domain.vo.RegistrationStatisticsVO;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.service.ICompetitionTeamsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

/**
 * Reporting is now its own service, so these tests need two collaborators instead of the six the
 * registration service carries. They moved here wholesale from
 * {@code CompetitionParticipantsServiceImplTest}.
 */
class ParticipantAnalyticsServiceImplTest {

    private CompetitionGateway competitionGateway;
    private ICompetitionTeamsService competitionTeamsService;
    private ParticipantAnalyticsServiceImpl analytics;

    @SuppressWarnings("unchecked")
    private LambdaQueryChainWrapper<CompetitionParticipants> participantQuery =
            mock(LambdaQueryChainWrapper.class);

    @SuppressWarnings("unchecked")
    private LambdaQueryChainWrapper<CompetitionTeams> teamQuery =
            mock(LambdaQueryChainWrapper.class);

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        competitionGateway = mock(CompetitionGateway.class);
        competitionTeamsService = mock(ICompetitionTeamsService.class);

        analytics = spy(new ParticipantAnalyticsServiceImpl(competitionGateway, competitionTeamsService));

        participantQuery = mock(LambdaQueryChainWrapper.class);
        teamQuery = mock(LambdaQueryChainWrapper.class);

        doReturn(participantQuery).when(analytics).lambdaQuery();
        when(competitionTeamsService.lambdaQuery()).thenReturn(teamQuery);

        when(participantQuery.eq(any(SFunction.class), any())).thenReturn(participantQuery);
        when(participantQuery.isNotNull(any(SFunction.class))).thenReturn(participantQuery);
        when(participantQuery.select((SFunction<CompetitionParticipants, ?>[]) any(SFunction[].class)))
                .thenReturn(participantQuery);

        when(teamQuery.eq(any(SFunction.class), any())).thenReturn(teamQuery);
        when(teamQuery.select((SFunction<CompetitionTeams, ?>[]) any(SFunction[].class)))
                .thenReturn(teamQuery);
    }

    @Test
    @DisplayName("Counts individual and team registrations for a competition")
    void registrationStatistics() {
        when(competitionGateway.require("comp-1")).thenReturn(new CompetitionResponseVO());
        when(participantQuery.count()).thenReturn(5L);
        when(teamQuery.count()).thenReturn(3L);

        RegistrationStatisticsVO vo = analytics.getRegistrationStatistics("comp-1");

        assertThat(vo.getIndividualParticipantCount()).isEqualTo(5);
        assertThat(vo.getTeamParticipantCount()).isEqualTo(3);
        assertThat(vo.getTotalRegistrations()).isEqualTo(8);
    }

    @Test
    @DisplayName("Refuses to report on a competition that does not exist")
    void registrationStatisticsRejectsUnknownCompetition() {
        when(competitionGateway.require("gone"))
                .thenThrow(new BusinessException(HttpStatus.NOT_FOUND, "Competition not found"));

        assertThatThrownBy(() -> analytics.getRegistrationStatistics("gone"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("Buckets a competition's registrations by calendar date")
    void participantTrend() {
        when(competitionGateway.require("comp-1")).thenReturn(new CompetitionResponseVO());

        LocalDateTime day = LocalDateTime.of(2026, 3, 4, 10, 0);
        when(participantQuery.list()).thenReturn(List.of(
                new CompetitionParticipants().setCreatedAt(day),
                new CompetitionParticipants().setCreatedAt(day.plusHours(3))));
        when(teamQuery.list()).thenReturn(List.of(
                new CompetitionTeams().setJoinedAt(day.plusDays(1))));

        Map<String, Map<String, Integer>> trend = analytics.getParticipantTrend("comp-1");

        // Two registrations on the same day collapse into one bucket of 2.
        assertThat(trend.get("individual")).containsExactly(Map.entry("2026-03-04", 2));
        assertThat(trend.get("team")).containsExactly(Map.entry("2026-03-05", 1));
    }

    @Test
    @DisplayName("Skips registrations with no timestamp rather than failing")
    void participantTrendTolerantOfMissingTimestamps() {
        when(competitionGateway.require("comp-1")).thenReturn(new CompetitionResponseVO());
        when(participantQuery.list()).thenReturn(List.of(new CompetitionParticipants()));
        when(teamQuery.list()).thenReturn(List.of(new CompetitionTeams()));

        Map<String, Map<String, Integer>> trend = analytics.getParticipantTrend("comp-1");

        assertThat(trend.get("individual")).isEmpty();
        assertThat(trend.get("team")).isEmpty();
    }

    @Test
    @DisplayName("Adds individual and team totals for the platform")
    void platformStatistics() {
        when(participantQuery.count()).thenReturn(42L);
        when(competitionTeamsService.countTeamParticipants()).thenReturn(7);

        PlatformParticipantStatisticsVO vo = analytics.getPlatformParticipantStatistics();

        assertThat(vo.getIndividualParticipants()).isEqualTo(42);
        assertThat(vo.getTeamParticipants()).isEqualTo(7);
        assertThat(vo.getTotalParticipants()).isEqualTo(49);
    }

    @Test
    @DisplayName("Platform trend needs no competition and reads both sides")
    void platformTrend() {
        LocalDateTime day = LocalDateTime.of(2026, 3, 4, 10, 0);
        when(participantQuery.list()).thenReturn(List.of(
                new CompetitionParticipants().setCreatedAt(day)));
        when(teamQuery.list()).thenReturn(List.of(
                new CompetitionTeams().setJoinedAt(day)));

        Map<String, Map<String, Integer>> trend = analytics.getPlatformParticipantTrend();

        assertThat(trend.get("individual")).containsExactly(Map.entry("2026-03-04", 1));
        assertThat(trend.get("team")).containsExactly(Map.entry("2026-03-04", 1));
    }
}
