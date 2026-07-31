package com.w16a.danish.registration.service.impl;

import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.common.domain.enums.ParticipationType;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.domain.po.CompetitionParticipants;
import com.w16a.danish.registration.domain.po.CompetitionTeams;
import com.w16a.danish.registration.domain.vo.ParticipantInfoVO;
import com.w16a.danish.registration.feign.UserServiceClient;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.mapper.CompetitionParticipantsMapper;
import com.w16a.danish.registration.notify.RegistrationNotifier;
import com.w16a.danish.registration.service.ICompetitionOrganizersService;
import com.w16a.danish.registration.service.ICompetitionTeamsService;
import com.w16a.danish.registration.service.ISubmissionRecordsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The refusals.
 *
 * The existing test class covers the paths where everything goes right. These cover the paths
 * where the service says no — who may register, who may cancel, who may see a competition's
 * participant list. Those branches decide authorisation and they were the least-covered code in
 * the service: a guard that stops being enforced still passes every happy-path test.
 *
 * The listing tests cover the other untested half — keyword, sort and page arithmetic — because a
 * silently mis-sorted or mis-paged list is a bug nobody reports as one.
 */
class CompetitionParticipantsServiceImplGuardsTest {

    private CompetitionParticipantsServiceImpl service;
    private CompetitionGateway competitionGateway;
    private ICompetitionOrganizersService organizersService;
    private UserServiceClient userServiceClient;
    private ISubmissionRecordsService submissionService;
    private RegistrationNotifier notifier;
    private ICompetitionTeamsService teamsService;

    private LambdaQueryChainWrapper<CompetitionParticipants> participantQuery;
    private LambdaQueryChainWrapper<CompetitionTeams> teamQuery;

    private static RequestContext participant(String id) {
        return new RequestContext(id, "PARTICIPANT");
    }

    private static RequestContext organizer(String id) {
        return new RequestContext(id, "ORGANIZER");
    }

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        competitionGateway = mock(CompetitionGateway.class);
        organizersService = mock(ICompetitionOrganizersService.class);
        userServiceClient = mock(UserServiceClient.class);
        submissionService = mock(ISubmissionRecordsService.class);
        notifier = mock(RegistrationNotifier.class);
        teamsService = mock(ICompetitionTeamsService.class);

        participantQuery = mock(LambdaQueryChainWrapper.class);
        teamQuery = mock(LambdaQueryChainWrapper.class);
        when(participantQuery.eq(any(), any())).thenReturn(participantQuery);
        when(teamQuery.eq(any(), any())).thenReturn(teamQuery);
        when(teamsService.lambdaQuery()).thenReturn(teamQuery);

        CompetitionParticipantsServiceImpl real = new CompetitionParticipantsServiceImpl(
                competitionGateway, organizersService, userServiceClient,
                submissionService, notifier, teamsService) {
            @Override
            public LambdaQueryChainWrapper<CompetitionParticipants> lambdaQuery() {
                return participantQuery;
            }
        };
        ReflectionTestUtils.setField(real, "baseMapper", mock(CompetitionParticipantsMapper.class));
        service = spy(real);
    }

    /** An organizer who does own the competition, so ownership stops being the thing under test. */
    private void organizerOwnsCompetition(boolean owns) {
        @SuppressWarnings("unchecked")
        LambdaQueryChainWrapper<com.w16a.danish.registration.domain.po.CompetitionOrganizers> q =
                mock(LambdaQueryChainWrapper.class);
        when(q.eq(any(), any())).thenReturn(q);
        when(q.exists()).thenReturn(owns);
        when(organizersService.lambdaQuery()).thenReturn(q);
    }

    private static UserBriefVO user(String id, String name, String email) {
        UserBriefVO u = new UserBriefVO();
        u.setId(id);
        u.setName(name);
        u.setEmail(email);
        return u;
    }

    private static void assertRefused(org.assertj.core.api.ThrowableAssert.ThrowingCallable call,
                                      HttpStatus status, String messagePart) {
        assertThatThrownBy(call)
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining(messagePart)
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(status);
    }

    @Nested
    @DisplayName("Registering as an individual")
    class Register {

        @Test
        @DisplayName("A judge cannot register — the role check runs before anything else")
        void wrongRoleIsRefused() {
            assertRefused(() -> service.register("c1", new RequestContext("u1", "JUDGE")),
                    HttpStatus.FORBIDDEN, "PARTICIPANT");
            verify(competitionGateway, never()).require(anyString());
        }

        @Test
        @DisplayName("A completed competition is closed to new entrants")
        void closedCompetitionIsRefused() {
            CompetitionResponseVO c = new CompetitionResponseVO();
            c.setStatus(CompetitionStatus.COMPLETED);
            when(competitionGateway.require("c1")).thenReturn(c);

            assertRefused(() -> service.register("c1", participant("u1")),
                    HttpStatus.BAD_REQUEST, "UPCOMING or ONGOING");
        }

        @Test
        @DisplayName("An unreachable competition-service is 503, and keeps its own message")
        void upstreamFailureBecomesServiceUnavailable() {
            when(competitionGateway.require("c1")).thenThrow(new IllegalStateException("connection reset"));

            assertRefused(() -> service.register("c1", participant("u1")),
                    HttpStatus.SERVICE_UNAVAILABLE, "connection reset");
        }

        @Test
        @DisplayName("Registering twice is a conflict, not a second row")
        void duplicateRegistrationIsRefused() {
            CompetitionResponseVO c = new CompetitionResponseVO();
            c.setStatus(CompetitionStatus.ONGOING);
            when(competitionGateway.require("c1")).thenReturn(c);
            when(participantQuery.exists()).thenReturn(true);

            assertRefused(() -> service.register("c1", participant("u1")),
                    HttpStatus.CONFLICT, "already registered");
            verify(service, never()).save(any(CompetitionParticipants.class));
        }

        @Test
        @DisplayName("A failed insert is reported rather than silently succeeding")
        void failedSaveIsReported() {
            CompetitionResponseVO c = new CompetitionResponseVO();
            c.setStatus(CompetitionStatus.ONGOING);
            when(competitionGateway.require("c1")).thenReturn(c);
            when(participantQuery.exists()).thenReturn(false);
            doReturn(false).when(service).save(any(CompetitionParticipants.class));

            assertRefused(() -> service.register("c1", participant("u1")),
                    HttpStatus.INTERNAL_SERVER_ERROR, "Failed to register");
            verify(notifier, never()).sendRegisterSuccess(any());
        }

        @Test
        @DisplayName("A missing user stops the notification instead of sending a blank one")
        void missingUserStopsTheNotification() {
            CompetitionResponseVO c = new CompetitionResponseVO();
            c.setStatus(CompetitionStatus.UPCOMING);
            when(competitionGateway.require("c1")).thenReturn(c);
            when(participantQuery.exists()).thenReturn(false);
            doReturn(true).when(service).save(any(CompetitionParticipants.class));
            when(userServiceClient.getUserBriefById("u1")).thenReturn(ResponseEntity.ok(null));

            assertRefused(() -> service.register("c1", participant("u1")),
                    HttpStatus.NOT_FOUND, "User not found");
            verify(notifier, never()).sendRegisterSuccess(any());
        }
    }

    @Nested
    @DisplayName("Cancelling your own registration")
    class Cancel {

        @Test
        @DisplayName("Cancelling something you never registered for is 404")
        void unknownRegistrationIsRefused() {
            when(participantQuery.one()).thenReturn(null);

            assertRefused(() -> service.cancelRegistration("c1", participant("u1")),
                    HttpStatus.NOT_FOUND, "have not registered");
        }

        @Test
        @DisplayName("An existing submission is deleted along with the registration")
        void submissionsAreRemovedWithTheRegistration() {
            when(participantQuery.one()).thenReturn(new CompetitionParticipants().setId("reg-1"));

            @SuppressWarnings("unchecked")
            LambdaQueryChainWrapper<com.w16a.danish.registration.domain.po.SubmissionRecords> subQuery =
                    mock(LambdaQueryChainWrapper.class);
            when(subQuery.eq(any(), any())).thenReturn(subQuery);
            when(subQuery.exists()).thenReturn(true);
            when(submissionService.lambdaQuery()).thenReturn(subQuery);
            doReturn(true).when(service).removeById("reg-1");

            service.cancelRegistration("c1", participant("u1"));

            verify(submissionService).deleteSubmissionsByUserAndCompetition("u1", "c1");
        }

        @Test
        @DisplayName("A failed delete is reported rather than reported as success")
        void failedRemovalIsReported() {
            when(participantQuery.one()).thenReturn(new CompetitionParticipants().setId("reg-1"));

            @SuppressWarnings("unchecked")
            LambdaQueryChainWrapper<com.w16a.danish.registration.domain.po.SubmissionRecords> subQuery =
                    mock(LambdaQueryChainWrapper.class);
            when(subQuery.eq(any(), any())).thenReturn(subQuery);
            when(subQuery.exists()).thenReturn(false);
            when(submissionService.lambdaQuery()).thenReturn(subQuery);
            doReturn(false).when(service).removeById("reg-1");

            assertRefused(() -> service.cancelRegistration("c1", participant("u1")),
                    HttpStatus.INTERNAL_SERVER_ERROR, "Failed to cancel");
        }
    }

    @Nested
    @DisplayName("Registering a team")
    class RegisterTeam {

        @Test
        @DisplayName("Only the team's creator may enter it — a member cannot")
        void nonCreatorIsRefused() {
            when(userServiceClient.getTeamCreator("t1"))
                    .thenReturn(ResponseEntity.ok(user("someone-else", "Creator", "c@example.com")));

            assertRefused(() -> service.registerTeam("c1", "t1", participant("u1")),
                    HttpStatus.FORBIDDEN, "team creator");
            verify(competitionGateway, never()).require(anyString());
        }

        @Test
        @DisplayName("A team with no creator on record is refused, not treated as ownerless")
        void missingCreatorIsRefused() {
            when(userServiceClient.getTeamCreator("t1")).thenReturn(ResponseEntity.ok(null));

            assertRefused(() -> service.registerTeam("c1", "t1", participant("u1")),
                    HttpStatus.FORBIDDEN, "team creator");
        }

        @Test
        @DisplayName("An individual competition refuses a team entry")
        void individualCompetitionRefusesATeam() {
            when(userServiceClient.getTeamCreator("t1"))
                    .thenReturn(ResponseEntity.ok(user("u1", "Creator", "c@example.com")));
            CompetitionResponseVO c = new CompetitionResponseVO();
            c.setStatus(CompetitionStatus.ONGOING);
            c.setParticipationType(ParticipationType.INDIVIDUAL);
            when(competitionGateway.require("c1")).thenReturn(c);

            assertRefused(() -> service.registerTeam("c1", "t1", participant("u1")),
                    HttpStatus.BAD_REQUEST, "team registration");
        }

        @Test
        @DisplayName("A team already entered cannot enter twice")
        void duplicateTeamRegistrationIsRefused() {
            when(userServiceClient.getTeamCreator("t1"))
                    .thenReturn(ResponseEntity.ok(user("u1", "Creator", "c@example.com")));
            CompetitionResponseVO c = new CompetitionResponseVO();
            c.setStatus(CompetitionStatus.ONGOING);
            c.setParticipationType(ParticipationType.TEAM);
            when(competitionGateway.require("c1")).thenReturn(c);
            when(teamQuery.exists()).thenReturn(true);

            assertRefused(() -> service.registerTeam("c1", "t1", participant("u1")),
                    HttpStatus.CONFLICT, "already registered");
            verify(teamsService, never()).save(any(CompetitionTeams.class));
        }
    }

    @Nested
    @DisplayName("Cancelling a team's registration")
    class CancelTeam {

        @Test
        @DisplayName("A team with no creator on record is 404, distinct from the 403 below")
        void missingCreatorIsNotFound() {
            when(userServiceClient.getTeamCreator("t1")).thenReturn(ResponseEntity.ok(null));

            assertRefused(() -> service.cancelTeamRegistration("c1", "t1", participant("u1")),
                    HttpStatus.NOT_FOUND, "creator not found");
        }

        @Test
        @DisplayName("A member who is not the creator is 403")
        void nonCreatorIsForbidden() {
            when(userServiceClient.getTeamCreator("t1"))
                    .thenReturn(ResponseEntity.ok(user("other", "Creator", "c@example.com")));

            assertRefused(() -> service.cancelTeamRegistration("c1", "t1", participant("u1")),
                    HttpStatus.FORBIDDEN, "team creator");
        }

        @Test
        @DisplayName("Cancelling an entry that does not exist is 404")
        void unregisteredTeamIsNotFound() {
            when(userServiceClient.getTeamCreator("t1"))
                    .thenReturn(ResponseEntity.ok(user("u1", "Creator", "c@example.com")));
            when(teamQuery.one()).thenReturn(null);

            assertRefused(() -> service.cancelTeamRegistration("c1", "t1", participant("u1")),
                    HttpStatus.NOT_FOUND, "not registered");
        }
    }

    @Nested
    @DisplayName("An organizer acting on someone else's competition")
    class OrganizerScope {

        @Test
        @DisplayName("Listing participants of a competition you do not run is 403")
        void listingSomeoneElsesCompetitionIsRefused() {
            organizerOwnsCompetition(false);

            assertRefused(() -> service.getParticipantsByCompetitionWithSearch(
                            "c1", organizer("o1"), 1, 10, null, "name", "asc"),
                    HttpStatus.FORBIDDEN, "not authorized");
        }

        @Test
        @DisplayName("Removing a participant from a competition you do not run is 403")
        void removingFromSomeoneElsesCompetitionIsRefused() {
            organizerOwnsCompetition(false);

            assertRefused(() -> service.cancelByOrganizer("c1", "p1", organizer("o1")),
                    HttpStatus.FORBIDDEN, "not authorized");
        }

        @Test
        @DisplayName("Removing someone who never registered is 404")
        void removingAnUnregisteredParticipantIsNotFound() {
            organizerOwnsCompetition(true);
            when(participantQuery.one()).thenReturn(null);

            assertRefused(() -> service.cancelByOrganizer("c1", "p1", organizer("o1")),
                    HttpStatus.NOT_FOUND, "not registered");
        }

        @Test
        @DisplayName("A participant list is empty rather than a failed lookup when nobody entered")
        void emptyCompetitionReturnsAnEmptyPage() {
            organizerOwnsCompetition(true);
            when(participantQuery.list()).thenReturn(List.of());

            PageResponse<ParticipantInfoVO> result = service.getParticipantsByCompetitionWithSearch(
                    "c1", organizer("o1"), 1, 10, null, "name", "asc");

            assertThat(result.getData()).isEmpty();
            assertThat(result.getTotal()).isZero();
            verify(userServiceClient, never()).getUsersByIds(anyList(), anyString());
        }
    }

    @Nested
    @DisplayName("Searching, sorting and paging the participant list")
    class Listing {

        private void threeParticipantsRegistered() {
            organizerOwnsCompetition(true);
            LocalDateTime base = LocalDateTime.of(2026, 1, 1, 0, 0);
            when(participantQuery.list()).thenReturn(List.of(
                    new CompetitionParticipants().setUserId("u1").setCreatedAt(base),
                    new CompetitionParticipants().setUserId("u2").setCreatedAt(base.plusDays(1)),
                    new CompetitionParticipants().setUserId("u3").setCreatedAt(base.plusDays(2))));
            when(userServiceClient.getUsersByIds(anyList(), anyString())).thenReturn(ResponseEntity.ok(List.of(
                    user("u1", "Charlie", "charlie@example.com"),
                    user("u2", "alice", "alice@example.com"),
                    user("u3", "Bob", "bob@example.com"))));
        }

        private PageResponse<ParticipantInfoVO> list(int page, int size, String keyword,
                                                    String sortBy, String order) {
            return service.getParticipantsByCompetitionWithSearch(
                    "c1", organizer("o1"), page, size, keyword, sortBy, order);
        }

        @Test
        @DisplayName("Sorting by name ignores case, so 'alice' is not filed after 'Charlie'")
        void nameSortIgnoresCase() {
            threeParticipantsRegistered();

            assertThat(list(1, 10, null, "name", "asc").getData())
                    .extracting(ParticipantInfoVO::getName)
                    .containsExactly("alice", "Bob", "Charlie");
        }

        @Test
        @DisplayName("Descending order reverses whichever field was chosen")
        void descendingReversesTheChosenField() {
            threeParticipantsRegistered();

            assertThat(list(1, 10, null, "email", "DESC").getData())
                    .extracting(ParticipantInfoVO::getEmail)
                    .containsExactly("charlie@example.com", "bob@example.com", "alice@example.com");
        }

        @Test
        @DisplayName("Sorting by registration date uses the date, not the name")
        void registeredAtSortUsesTheDate() {
            threeParticipantsRegistered();

            assertThat(list(1, 10, null, "registeredAt", "asc").getData())
                    .extracting(ParticipantInfoVO::getName)
                    .containsExactly("Charlie", "alice", "Bob");
        }

        @Test
        @DisplayName("An unknown sort field falls back to name rather than failing the request")
        void unknownSortFieldFallsBackToName() {
            threeParticipantsRegistered();

            assertThat(list(1, 10, null, "shoeSize", "asc").getData())
                    .extracting(ParticipantInfoVO::getName)
                    .containsExactly("alice", "Bob", "Charlie");
        }

        @Test
        @DisplayName("A keyword matches either name or email, case-insensitively")
        void keywordMatchesNameOrEmail() {
            threeParticipantsRegistered();

            assertThat(list(1, 10, "BOB", "name", "asc").getData())
                    .extracting(ParticipantInfoVO::getName)
                    .containsExactly("Bob");

            assertThat(list(1, 10, "alice@", "name", "asc").getData())
                    .extracting(ParticipantInfoVO::getName)
                    .containsExactly("alice");
        }

        @Test
        @DisplayName("A blank keyword filters nothing, rather than matching nothing")
        void blankKeywordDoesNotFilter() {
            threeParticipantsRegistered();

            assertThat(list(1, 10, "   ", "name", "asc").getData()).hasSize(3);
        }

        @Test
        @DisplayName("Paging reports the true total, not the size of the page")
        void pagingReportsTheTrueTotal() {
            threeParticipantsRegistered();

            PageResponse<ParticipantInfoVO> first = list(1, 2, null, "name", "asc");

            assertThat(first.getData()).extracting(ParticipantInfoVO::getName)
                    .containsExactly("alice", "Bob");
            assertThat(first.getTotal()).isEqualTo(3);
            assertThat(first.getPages()).isEqualTo(2);
        }

        @Test
        @DisplayName("A page past the end is empty rather than an index error")
        void pagePastTheEndIsEmpty() {
            threeParticipantsRegistered();

            PageResponse<ParticipantInfoVO> beyond = list(9, 10, null, "name", "asc");

            assertThat(beyond.getData()).isEmpty();
            assertThat(beyond.getTotal()).isEqualTo(3);
        }
    }
}
