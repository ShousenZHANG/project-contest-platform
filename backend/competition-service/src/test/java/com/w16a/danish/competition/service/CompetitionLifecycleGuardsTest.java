package com.w16a.danish.competition.service;

import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.common.domain.enums.ParticipationType;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.competition.domain.dto.CompetitionCreateDTO;
import com.w16a.danish.competition.domain.dto.CompetitionUpdateDTO;
import com.w16a.danish.competition.domain.po.Competitions;
import com.w16a.danish.competition.feign.FileServiceClient;
import com.w16a.danish.competition.feign.UserServiceClient;
import com.w16a.danish.competition.mapper.CompetitionsMapper;
import com.w16a.danish.competition.notify.CompetitionNotifier;
import com.w16a.danish.competition.service.impl.CompetitionsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CompetitionLifecycleGuardsTest {
    private static final RequestContext ADMIN = new RequestContext("admin1", "ADMIN");
    private static final LocalDateTime START = LocalDateTime.of(2026, 10, 1, 0, 0);
    private static final LocalDateTime END = START.plusDays(7);
    private CompetitionsServiceImpl service;
    private CompetitionsMapper mapper;
    private ICompetitionOrganizersService organizers;
    private Competitions competition;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        organizers = mock(ICompetitionOrganizersService.class);
        service = spy(new CompetitionsServiceImpl(mock(FileServiceClient.class), organizers,
                mock(UserServiceClient.class), mock(ICompetitionJudgesService.class), mock(CompetitionNotifier.class),
                mock(com.w16a.danish.competition.notify.CompetitionMediaFiles.class)));
        mapper = mock(CompetitionsMapper.class);
        ReflectionTestUtils.setField(service, "baseMapper", mapper);
        competition = new Competitions();
        competition.setId("c1");
        competition.setStatus(CompetitionStatus.UPCOMING);
        competition.setStartDate(START);
        competition.setEndDate(END);
        competition.setParticipationType(ParticipationType.INDIVIDUAL);
        competition.setAllowedSubmissionTypes(List.of("PDF"));
        competition.setScoringCriteria(List.of("Innovation", "Design"));
        doReturn(competition).when(service).getById("c1");
        doReturn(true).when(service).updateById(any(Competitions.class));
        doReturn(true).when(service).save(any(Competitions.class));
        LambdaQueryChainWrapper<Competitions> query = mock(LambdaQueryChainWrapper.class);
        when(query.eq(any(), any())).thenReturn(query);
        when(query.exists()).thenReturn(false);
        doReturn(query).when(service).lambdaQuery();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ONGOING", "COMPLETED", "AWARDED", "CANCELED"})
    void creationCannotSkipTheServerOwnedUpcomingStage(String requestedStatus) {
        var dto = create();
        dto.setStatus(requestedStatus);
        assertStatus(() -> service.createCompetition(dto, ADMIN), HttpStatus.CONFLICT);
        verify(service, never()).save(any());
        verifyNoInteractions(organizers);
    }

    @Test
    void creationDefaultsToUpcomingAndAssociatesTheCreatingOrganizer() {
        var result = service.createCompetition(create(), new RequestContext("organizer1", "ORGANIZER"));
        assertThat(result.getStatus()).isEqualTo(CompetitionStatus.UPCOMING);
        verify(organizers).save(argThat(owner -> "organizer1".equals(owner.getUserId()) && result.getId().equals(owner.getCompetitionId())));
    }

    @ParameterizedTest
    @ValueSource(strings = {"PARTICIPANT", "JUDGE", "UNKNOWN"})
    void publicCompetitionCreationRequiresAnAdministrativeOrOrganizerAccount(String role) {
        assertStatus(() -> service.createCompetition(create(), new RequestContext("u1", role)), HttpStatus.FORBIDDEN);
        verify(service, never()).save(any());
    }

    static Stream<List<String>> invalidCriteria() {
        return Stream.<List<String>>of(null, List.of(), List.of("Innovation", "Innovation"), List.of(" "),
                List.of(" Innovation"), List.of("Design "), List.of("X".repeat(101)),
                Arrays.asList("Design", null), java.util.stream.IntStream.rangeClosed(1, 21).mapToObj(n -> "Criterion" + n).toList());
    }

    @ParameterizedTest
    @MethodSource("invalidCriteria")
    void invalidCriteriaCannotBePersistedOnCreation(List<String> criteria) {
        var dto = create();
        dto.setScoringCriteria(criteria);
        assertStatus(() -> service.createCompetition(dto, ADMIN), HttpStatus.BAD_REQUEST);
        verify(service, never()).save(any());
    }

    @Test
    void invalidOrMissingDatesCannotBePersistedOnCreation() {
        var dto = create();
        dto.setEndDate(START);
        assertStatus(() -> service.createCompetition(dto, ADMIN), HttpStatus.BAD_REQUEST);
        dto.setEndDate(START.minusDays(1));
        assertStatus(() -> service.createCompetition(dto, ADMIN), HttpStatus.BAD_REQUEST);
        dto.setStartDate(null);
        assertStatus(() -> service.createCompetition(dto, ADMIN), HttpStatus.BAD_REQUEST);
        verify(service, never()).save(any());
    }

    @ParameterizedTest
    @CsvSource({"UPCOMING,ONGOING", "UPCOMING,CANCELED", "ONGOING,COMPLETED", "ONGOING,CANCELED", "COMPLETED,CANCELED"})
    void ordinaryEditingPermitsOnlyForwardLifecycleTransitions(CompetitionStatus from, String to) {
        competition.setStatus(from);
        var update = new CompetitionUpdateDTO();
        update.setStatus(to);
        assertThat(service.updateCompetition("c1", ADMIN, update).getStatus()).isEqualTo(CompetitionStatus.valueOf(to));
        verify(service).updateById(any(Competitions.class));
    }

    @ParameterizedTest
    @CsvSource({"UPCOMING,COMPLETED", "UPCOMING,AWARDED", "ONGOING,UPCOMING", "ONGOING,AWARDED", "COMPLETED,UPCOMING", "COMPLETED,ONGOING", "COMPLETED,AWARDED", "AWARDED,ONGOING", "CANCELED,ONGOING"})
    void ordinaryEditingCannotReopenScoringOrFinishAwards(CompetitionStatus from, String to) {
        competition.setStatus(from);
        var update = new CompetitionUpdateDTO();
        update.setStatus(to);
        assertStatus(() -> service.updateCompetition("c1", ADMIN, update), HttpStatus.CONFLICT);
        verify(service, never()).updateById(any());
    }

    static Stream<Consumer<CompetitionUpdateDTO>> frozenEdits() {
        return Stream.of(dto -> dto.setScoringCriteria(List.of("Changed")),
                dto -> dto.setParticipationType(ParticipationType.TEAM),
                dto -> dto.setAllowedSubmissionTypes(List.of("ZIP")),
                dto -> dto.setStartDate(START.plusHours(1)), dto -> dto.setEndDate(END.plusHours(1)));
    }

    @ParameterizedTest
    @MethodSource("frozenEdits")
    void scoringRulesAndDatesFreezeAfterOpening(Consumer<CompetitionUpdateDTO> edit) {
        competition.setStatus(CompetitionStatus.ONGOING);
        var update = new CompetitionUpdateDTO();
        edit.accept(update);
        assertStatus(() -> service.updateCompetition("c1", ADMIN, update), HttpStatus.CONFLICT);
        verify(service, never()).updateById(any());
    }

    @Test
    void unchangedFrozenFieldsAndDescriptionCanStillBeSavedDuringTheOpenStage() {
        competition.setStatus(CompetitionStatus.ONGOING);
        var update = new CompetitionUpdateDTO();
        update.setScoringCriteria(new ArrayList<>(competition.getScoringCriteria()));
        update.setParticipationType(competition.getParticipationType());
        update.setStartDate(START);
        update.setEndDate(END);
        update.setDescription("Clarified description");
        var result = service.updateCompetition("c1", ADMIN, update);
        assertThat(result.getDescription()).isEqualTo("Clarified description");
        assertThat(result.getStatus()).isEqualTo(CompetitionStatus.ONGOING);
    }

    @Test
    void finalizedAwardRunProtectsCompetitionBeforeAnyEdit() {
        when(mapper.lockLifecycle("c1")).thenReturn(END);
        assertStatus(() -> service.updateCompetition("c1", ADMIN, new CompetitionUpdateDTO()), HttpStatus.CONFLICT);
        verify(service, never()).updateById(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"UPCOMING", "ONGOING", "COMPLETED", "CANCELED"})
    void serviceOnlyStatusProjectionCannotWriteAnOrdinaryLifecycleState(String status) {
        competition.setStatus(CompetitionStatus.COMPLETED);
        assertStatus(() -> service.updateCompetitionStatus("c1", status), HttpStatus.FORBIDDEN);
        verify(service, never()).updateById(any());
    }

    @Test
    void serviceOnlyStatusProjectionCanFinishCompletedAwards() {
        competition.setStatus(CompetitionStatus.COMPLETED);
        assertThat(service.updateCompetitionStatus("c1", "AWARDED").getStatus()).isEqualTo(CompetitionStatus.AWARDED);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ONGOING", "COMPLETED", "AWARDED"})
    void competitionCannotBeDeletedWhileOpenOrAfterResultsHaveBeenProduced(CompetitionStatus status) {
        competition.setStatus(status);
        assertStatus(() -> service.deleteCompetition("c1", ADMIN), HttpStatus.CONFLICT);
        verify(service, never()).removeById(anyString());
        verify(organizers, never()).remove(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"UPCOMING", "CANCELED"})
    void draftAndCanceledCompetitionsCanBeDeletedBeforeAnAwardRun(CompetitionStatus status) {
        competition.setStatus(status);
        doReturn(true).when(service).removeById("c1");
        service.deleteCompetition("c1", ADMIN);
        verify(service).removeById("c1");
    }

    @Test
    void canceledCompetitionCannotEraseAFinalizedAwardRun() {
        competition.setStatus(CompetitionStatus.CANCELED);
        when(mapper.lockLifecycle("c1")).thenReturn(END);
        assertStatus(() -> service.deleteCompetition("c1", ADMIN), HttpStatus.CONFLICT);
        verify(service, never()).removeById(anyString());
    }

    private static CompetitionCreateDTO create() {
        var dto = new CompetitionCreateDTO();
        dto.setName("Lifecycle test");
        dto.setStartDate(START);
        dto.setEndDate(END);
        dto.setScoringCriteria(List.of("Innovation", "Design"));
        dto.setParticipationType(ParticipationType.INDIVIDUAL);
        return dto;
    }

    private static void assertStatus(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, HttpStatus status) {
        assertThatThrownBy(action).isInstanceOfSatisfying(BusinessException.class,
                error -> assertThat(error.getStatus()).isEqualTo(status));
    }
}
