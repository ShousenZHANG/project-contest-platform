package com.w16a.danish.registration.service.impl;

import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.common.exception.ServiceUnavailableException;
import com.w16a.danish.registration.domain.po.CompetitionOrganizers;
import com.w16a.danish.registration.domain.po.CompetitionParticipants;
import com.w16a.danish.registration.domain.po.CompetitionTeams;
import com.w16a.danish.registration.domain.vo.TeamInfoVO;
import com.w16a.danish.registration.feign.UserServiceClient;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.mapper.CompetitionParticipantsMapper;
import com.w16a.danish.registration.notify.RegistrationNotifier;
import com.w16a.danish.registration.service.ICompetitionOrganizersService;
import com.w16a.danish.registration.service.ICompetitionTeamsService;
import com.w16a.danish.registration.service.ISubmissionRecordsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TeamRegistrationPrivacyTest {
    private CompetitionParticipantsServiceImpl service;
    private CompetitionGateway competitions;
    private UserServiceClient users;
    private CompetitionParticipantsMapper mapper;
    private ICompetitionTeamsService teams;
    private LambdaQueryChainWrapper<CompetitionParticipants> individualQuery;
    private LambdaQueryChainWrapper<CompetitionOrganizers> organizerQuery;
    private LambdaQueryChainWrapper<CompetitionTeams> teamQuery;
    private CompetitionResponseVO competition;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        competitions = mock(CompetitionGateway.class);
        users = mock(UserServiceClient.class);
        mapper = mock(CompetitionParticipantsMapper.class);
        teams = mock(ICompetitionTeamsService.class);
        individualQuery = mock(LambdaQueryChainWrapper.class);
        organizerQuery = mock(LambdaQueryChainWrapper.class);
        teamQuery = mock(LambdaQueryChainWrapper.class);
        when(individualQuery.eq(any(), any())).thenReturn(individualQuery);
        when(organizerQuery.eq(any(), any())).thenReturn(organizerQuery);
        when(teamQuery.eq(any(), any())).thenReturn(teamQuery);
        when(teamQuery.list()).thenReturn(List.of());
        when(teams.lambdaQuery()).thenReturn(teamQuery);
        var organizers = mock(ICompetitionOrganizersService.class);
        when(organizers.lambdaQuery()).thenReturn(organizerQuery);
        service = new CompetitionParticipantsServiceImpl(competitions, organizers, users,
                mock(ISubmissionRecordsService.class), mock(RegistrationNotifier.class), teams) {
            @Override
            public LambdaQueryChainWrapper<CompetitionParticipants> lambdaQuery() {
                return individualQuery;
            }
        };
        ReflectionTestUtils.setField(service, "baseMapper", mapper);
        competition = new CompetitionResponseVO();
        competition.setIsPublic(false);
        when(competitions.require("c1")).thenReturn(competition);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "ORGANIZER", "JUDGE", "PARTICIPANT"})
    void managedListAllowsOnlyActualCompetitionRelations(String role) {
        when(organizerQuery.exists()).thenReturn(true);
        when(competitions.isAssignedJudge("c1", "u1")).thenReturn(true);
        when(individualQuery.exists()).thenReturn(true);
        assertThat(service.getManagedTeamsByCompetitionWithSearch(
                "c1", new RequestContext("u1", role), 1, 10, null, "teamName", "asc").getData()).isEmpty();
        verify(teams).lambdaQuery();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ORGANIZER", "JUDGE", "PARTICIPANT", "VISITOR"})
    void roleAloneCannotReadEvenAPublicCompetitionsManagedList(String role) {
        competition.setIsPublic(true);
        assertThatThrownBy(() -> service.getManagedTeamsByCompetitionWithSearch(
                "c1", new RequestContext("outsider", role), 1, 10, null, "teamName", "asc"))
                .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(teams, users);
    }

    @Test
    void registeredTeamEntrantCanReadTheManagedListWithoutIndividualRegistration() {
        when(mapper.hasRegisteredTeamMembership("c1", "u1")).thenReturn(true);
        assertThat(service.getManagedTeamsByCompetitionWithSearch(
                "c1", participant(), 1, 10, null, "teamName", "asc").getData()).isEmpty();
        verify(mapper).hasRegisteredTeamMembership("c1", "u1");
    }

    @Test
    void teamCompetitionViewAllowsCreatorWhoIsNotAMember() {
        creator("u1");
        assertThat(service.getCompetitionsRegisteredByTeam("t1", participant(), 1, 10, null, "competitionName", "asc")
                .getData()).isEmpty();
        verify(users, never()).isUserInTeam(anyString(), anyString());
    }

    @Test
    void teamCompetitionViewAllowsActualMemberAndRejectsOutsider() {
        creator("creator");
        when(users.isUserInTeam("u1", "t1")).thenReturn(ResponseEntity.ok(false));
        assertThatThrownBy(() -> service.getCompetitionsRegisteredByTeam("t1", participant(), 1, 10, null, "competitionName", "asc"))
                .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(teams);
        when(users.isUserInTeam("u1", "t1")).thenReturn(ResponseEntity.ok(true));
        assertThat(service.getCompetitionsRegisteredByTeam("t1", participant(), 1, 10, null, "competitionName", "asc")
                .getData()).isEmpty();
    }

    @Test
    void missingOrFailedUserIdentityNeverBecomesPermissionOrAnEmptyTeamView() {
        assertThatThrownBy(() -> service.getCompetitionsRegisteredByTeam("t1", participant(), 1, 10, null, "competitionName", "asc"))
                .isInstanceOf(ServiceUnavailableException.class);
        creator("creator");
        assertThatThrownBy(() -> service.getCompetitionsRegisteredByTeam("t1", participant(), 1, 10, null, "competitionName", "asc"))
                .isInstanceOf(ServiceUnavailableException.class);
        when(users.isUserInTeam("u1", "t1")).thenReturn(ResponseEntity.status(503).body(false));
        assertThatThrownBy(() -> service.getCompetitionsRegisteredByTeam("t1", participant(), 1, 10, null, "competitionName", "asc"))
                .isInstanceOf(ServiceUnavailableException.class);
        verifyNoInteractions(teams);
    }

    @Test
    void ownUnregisteredTeamCanQueryItsPrivateRegistrationStatus() {
        creator("u1");
        when(teamQuery.exists()).thenReturn(false);
        assertThat(service.isTeamRegistered("c1", "t1", participant())).isFalse();
        verify(users).getTeamCreator("t1");
    }

    @Test
    void privateRegistrationStatusRejectsAnOutsiderBeforeReadingTheRegistration() {
        creator("creator");
        when(users.isUserInTeam("u1", "t1")).thenReturn(ResponseEntity.ok(false));
        assertThatThrownBy(() -> service.isTeamRegistered("c1", "t1", participant()))
                .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(teams);
    }

    @Test
    void publicRegistrationBooleanDoesNotNeedPrivateTeamMetadata() {
        competition.setIsPublic(true);
        when(teamQuery.exists()).thenReturn(true);
        assertThat(service.isTeamRegistered("c1", "t1", participant())).isTrue();
        verifyNoInteractions(users, mapper);
    }

    @Test
    void listPageBoundsRejectBadInputsAndLargePageNumbersDoNotOverflow() {
        for (int[] input : new int[][]{{0, 10}, {1, 0}, {1, 101}}) {
            assertThatThrownBy(() -> service.getTeamsByCompetitionWithSearch("c1", input[0], input[1], null, "teamName", "asc"))
                    .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        }
        when(teamQuery.list()).thenReturn(List.of(new CompetitionTeams().setTeamId("t1")));
        var team = new TeamInfoVO();
        team.setTeamId("t1");
        team.setTeamName("Team");
        team.setCreatedAt(LocalDateTime.now());
        when(users.getTeamBriefByIds(List.of("t1"))).thenReturn(ResponseEntity.ok(List.of(team)));
        var page = service.getTeamsByCompetitionWithSearch("c1", Integer.MAX_VALUE, 100, null, "teamName", "asc");
        assertThat(page.getData()).isEmpty();
        assertThat(page.getTotal()).isEqualTo(1);
    }

    private void creator(String id) {
        var user = new UserBriefVO();
        user.setId(id);
        when(users.getTeamCreator("t1")).thenReturn(ResponseEntity.ok(user));
    }

    private static RequestContext participant() {
        return new RequestContext("u1", "PARTICIPANT");
    }
}
