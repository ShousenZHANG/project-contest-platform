package com.w16a.danish.judge.service.impl;

import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.common.domain.enums.*;
import com.w16a.danish.common.domain.vo.*;
import com.w16a.danish.judge.domain.po.*;
import com.w16a.danish.judge.domain.vo.*;
import com.w16a.danish.judge.feign.*;
import com.w16a.danish.judge.gateway.CompetitionGateway;
import com.w16a.danish.judge.mapper.*;
import com.w16a.danish.judge.notify.AwardNotifier;
import com.w16a.danish.judge.service.*;
import org.junit.jupiter.api.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import com.w16a.danish.common.exception.BusinessException;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SubmissionWinnersServiceImplTest {
    private final CompetitionGateway competitions = mock(CompetitionGateway.class);
    private final SubmissionServiceClient submissions = mock(SubmissionServiceClient.class);
    private final ISubmissionJudgeScoresService scores = mock(ISubmissionJudgeScoresService.class);
    private final ISubmissionJudgesService judges = mock(ISubmissionJudgesService.class);
    private final UserServiceClient users = mock(UserServiceClient.class);
    private final AwardNotifier notifier = mock(AwardNotifier.class);
    private final SubmissionJudgesMapper judgeMapper = mock(SubmissionJudgesMapper.class);
    private final SubmissionWinnersMapper winnerMapper = mock(SubmissionWinnersMapper.class);
    private final AwardRunMapper runs = mock(AwardRunMapper.class);
    private final DurableTasks tasks = mock(DurableTasks.class);
    private SubmissionWinnersServiceImpl service;
    private CompetitionResponseVO competition;
    private final List<SubmissionInfoVO> approved = new ArrayList<>();
    private final List<SubmissionJudges> records = new ArrayList<>();
    private final List<SubmissionJudgeScores> details = new ArrayList<>();
    private final List<SubmissionWinners> winners = new ArrayList<>();
    private final AtomicReference<LocalDateTime> awardedAt = new AtomicReference<>();
    private final RequestContext organizer = new RequestContext("owner", "ORGANIZER");

    @BeforeEach @SuppressWarnings("unchecked") void setUp() {
        service = spy(new SubmissionWinnersServiceImpl(competitions, submissions, scores, judges, users, notifier, judgeMapper, runs, tasks));
        ReflectionTestUtils.setField(service, "baseMapper", winnerMapper);
        var winnerQuery = mock(LambdaQueryChainWrapper.class, RETURNS_SELF);
        when(winnerQuery.eq(any(), any())).thenReturn(winnerQuery);
        doReturn(winnerQuery).when(service).lambdaQuery();
        when(winnerQuery.exists()).thenAnswer(call -> !winners.isEmpty());
        when(winnerQuery.list()).thenAnswer(call -> List.copyOf(winners));
        var judgeQuery = mock(LambdaQueryChainWrapper.class, RETURNS_SELF);
        when(judgeQuery.eq(any(), any())).thenReturn(judgeQuery);
        when(judgeQuery.in(any(), anyCollection())).thenReturn(judgeQuery);
        doReturn(judgeQuery).when(judges).lambdaQuery();
        when(judgeQuery.list()).thenAnswer(call -> List.copyOf(records));
        when(scores.listBySubmissionIds(anyList())).thenAnswer(call -> List.copyOf(details));
        when(judgeMapper.selectValidJudgeIds("c")).thenReturn(Set.of("j1", "j2", "j3", "j4"));
        competition = new CompetitionResponseVO(); competition.setId("c"); competition.setStatus(CompetitionStatus.COMPLETED);
        competition.setIsPublic(true);
        competition.setScoringCriteria(List.of("A", "B")); competition.setParticipationType(ParticipationType.INDIVIDUAL);
        when(competitions.require("c")).thenReturn(competition);
        when(competitions.isOrganiser("c", "owner")).thenReturn(true);
        when(submissions.getApprovedSubmissions("c")).thenAnswer(call -> ResponseEntity.ok(List.copyOf(approved)));
        when(submissions.getSubmissionsByIds(anyList())).thenAnswer(call -> {
            List<String> ids = call.getArgument(0);
            return ResponseEntity.ok(approved.stream().filter(s -> ids.contains(s.getId())).toList());
        });
        when(runs.lockRun("c")).thenAnswer(call -> awardedAt.get());
        when(runs.awardedAt("c")).thenAnswer(call -> awardedAt.get());
        when(runs.markAwarded("c")).thenAnswer(call -> { awardedAt.set(LocalDateTime.now()); return 1; });
        doAnswer(call -> { winners.addAll(call.getArgument(0)); return true; }).when(service).saveBatch(anyCollection());
        when(users.getUsersByIds(anyList(), isNull())).thenReturn(ResponseEntity.ok(List.of()));
        when(users.getTeamBriefByIds(anyList())).thenReturn(ResponseEntity.ok(List.of()));
        when(users.getUserBriefById(anyString())).thenAnswer(call -> ResponseEntity.ok(UserBriefVO.builder()
                .id(call.getArgument(0)).name("Participant").email("participant@example.com").build()));
    }

    private void work(String id, int judgeCount, String a, String b) {
        var submission = new SubmissionInfoVO(); submission.setId(id); submission.setCompetitionId("c");
        submission.setUserId("u" + id); submission.setReviewStatus("APPROVED"); submission.setTitle("Project " + id);
        submission.setTotalScore(new BigDecimal("999")); approved.add(submission);
        for (int j = 1; j <= judgeCount; j++) {
            String record = id + ":" + j;
            records.add(new SubmissionJudges().setId(record).setCompetitionId("c").setSubmissionId(id)
                    .setJudgeId("j" + j).setScoreSchemaVersion(1));
            details.add(new SubmissionJudgeScores().setJudgeRecordId(record).setSubmissionId(id).setCriterion("A").setScore(new BigDecimal(a)));
            details.add(new SubmissionJudgeScores().setJudgeRecordId(record).setSubmissionId(id).setCriterion("B").setScore(new BigDecimal(b)));
        }
    }

    @Test void eligibilityIncludesEveryApprovedWorkIncludingZeroScores() {
        work("ready", 3, "8", "6"); work("empty", 0, "0", "0");
        var eligibility = service.getAwardEligibility(organizer, "c");
        assertThat(eligibility.getApprovedCount()).isEqualTo(2);
        assertThat(eligibility.getEligibleCount()).isEqualTo(1);
        assertThat(eligibility.isCanAward()).isFalse();
        var empty = eligibility.getSubmissions().stream().filter(s -> s.getSubmissionId().equals("empty")).findFirst().orElseThrow();
        assertThat(empty.getJudgeCount()).isZero(); assertThat(empty.getTotalScore()).isNull();
        assertThat(empty.getBlockers()).isNotEmpty();
        assertThat(eligibility.getMinimumJudgeCount()).isEqualTo(3);
        assertThat(eligibility.getIsPublic()).isTrue();
    }

    @Test void insufficientWorkBlocksTheWholeCompetition() {
        work("ready", 3, "8", "6"); work("late", 2, "10", "10");
        assertThatThrownBy(() -> service.autoAward(organizer, "c")).hasMessageContaining("Every approved submission");
        assertThat(winners).isEmpty(); verify(runs, never()).markAwarded(anyString());
    }

    @Test void scoredListIncludesInsufficientWorksAndOrdersByAuthoritativeMean() {
        work("a", 3, "8", "6"); work("z", 0, "0", "0");
        var list = service.listScoredSubmissions(organizer, "c", null, "totalScore", "desc", 1, 10);
        assertThat(list.getData()).extracting(ScoredSubmissionVO::getSubmissionId).containsExactly("a", "z");
        assertThat(list.getData().getFirst().getTotalScore()).isEqualByComparingTo("7.00");
    }

    @Test void allApprovedWorksWithThreeJudgesAwardOnceAndPreserveCompetitionRankingTies() {
        work("a", 3, "10", "8"); work("b", 3, "8", "10"); work("c", 3, "8", "8");
        service.autoAward(organizer, "c");
        assertThat(winners.stream().filter(w -> w.getRankSubmission() != null).toList())
                .extracting(SubmissionWinners::getRankSubmission).containsExactly(1, 1, 3);
        assertThat(winners.stream().filter(w -> w.getSubmissionId().equals("a") && w.getAwardName().equals("Best in A")))
                .hasSize(1);
        assertThat(winners).allSatisfy(w -> assertThat(w.getTotalScore()).isBetween(BigDecimal.ZERO, BigDecimal.TEN));
        int count = winners.size(); service.autoAward(organizer, "c");
        assertThat(winners).hasSize(count);
        verify(tasks, times(1)).enqueue("COMPETITION_AWARDED", "c", null, Map.of());
    }

    @Test void criterionAwardUsesAllJudgesNotFirstReturnedDetail() {
        work("a", 3, "10", "8"); work("b", 3, "8", "8");
        details.stream().filter(d -> d.getSubmissionId().equals("a") && d.getCriterion().equals("A")
                && !d.getJudgeRecordId().endsWith(":1")).forEach(d -> d.setScore(BigDecimal.ZERO));
        Collections.reverse(details);
        service.autoAward(organizer, "c");
        assertThat(winners.stream().filter(w -> w.getAwardName().equals("Best in A")))
                .extracting(SubmissionWinners::getSubmissionId).containsExactly("b");
    }

    @Test void removedNonJudgeAndCorruptedScoresDoNotCount() {
        work("a", 3, "10", "8");
        when(judgeMapper.selectValidJudgeIds("c")).thenReturn(Set.of("j1", "j2"));
        assertThat(service.getAwardEligibility(organizer, "c").getSubmissions().getFirst().getJudgeCount()).isEqualTo(2);
        when(judgeMapper.selectValidJudgeIds("c")).thenReturn(Set.of("j1", "j2", "j3"));
        details.getFirst().setScore(new BigDecimal("100"));
        assertThat(service.getAwardEligibility(organizer, "c").getSubmissions().getFirst().getJudgeCount()).isEqualTo(2);
    }

    @Test void legacyScaleAndOldFileRevisionsBlockAwardUntilEveryJudgeRescores() {
        work("a", 3, "8", "6");
        records.getFirst().setScoreSchemaVersion(0);
        var row = service.getAwardEligibility(organizer, "c").getSubmissions().getFirst();
        assertThat(row.getJudgeCount()).isEqualTo(2); assertThat(row.isEligible()).isFalse();
        records.getFirst().setScoreSchemaVersion(1);
        approved.getFirst().setRevision(1);
        row = service.getAwardEligibility(organizer, "c").getSubmissions().getFirst();
        assertThat(row.getJudgeCount()).isZero(); assertThat(row.getTotalScore()).isNull();
        assertThatThrownBy(() -> service.autoAward(organizer, "c")).hasMessageContaining("Every approved submission");
        records.forEach(record -> record.setSubmissionRevision(1));
        assertThat(service.getAwardEligibility(organizer, "c").isCanAward()).isTrue();
    }

    @Test void onlyCompletedCompetitionsAwardAndLegacyAwardedResultsAreImmutable() {
        work("a", 3, "10", "8"); competition.setStatus(CompetitionStatus.ONGOING);
        assertThatThrownBy(() -> service.autoAward(organizer, "c")).hasMessageContaining("COMPLETED");
        competition.setStatus(CompetitionStatus.AWARDED); service.autoAward(organizer, "c");
        assertThat(winners).isEmpty(); verify(competitions, never()).updateStatus(anyString(), anyString());
    }

    @Test void malformedReviewOrCompetitionCannotBecomeAnAwardCandidate() {
        work("a", 3, "10", "8"); approved.getFirst().setReviewStatus("REJECTED");
        assertThatThrownBy(() -> service.getAwardEligibility(organizer, "c")).hasMessageContaining("approved");
        approved.getFirst().setReviewStatus("APPROVED"); approved.getFirst().setCompetitionId("other");
        assertThatThrownBy(() -> service.autoAward(organizer, "c")).hasMessageContaining("does not belong");
    }

    @Test void emptyAndFailedSourceReadsNeverProceed() {
        assertThat(service.getAwardEligibility(organizer, "c").isCanAward()).isFalse();
        assertThatThrownBy(() -> service.autoAward(organizer, "c")).hasMessageContaining("No approved");
        when(submissions.getApprovedSubmissions("c")).thenReturn(null);
        assertThatThrownBy(() -> service.autoAward(organizer, "c")).hasMessageContaining("no approved-submission data");
    }

    @Test void unauthorizedActorCannotPreviewOrAward() {
        var participant = new RequestContext("owner", "PARTICIPANT");
        assertThatThrownBy(() -> service.getAwardEligibility(participant, "c")).hasMessageContaining("Only organizers");
        assertThatThrownBy(() -> service.autoAward(participant, "c")).hasMessageContaining("Only organizers");
        assertThatThrownBy(() -> service.autoAward(new RequestContext("stranger", "ORGANIZER"), "c"))
                .hasMessageContaining("Only organizers");
    }

    @Test void winnerPersistenceFailureDoesNotFinalizeOrPublish() {
        work("a", 3, "10", "8"); doReturn(false).when(service).saveBatch(anyCollection());
        assertThatThrownBy(() -> service.autoAward(organizer, "c")).hasMessageContaining("persist");
        verify(runs, never()).markAwarded(anyString()); verify(competitions, never()).updateStatus(anyString(), anyString());
    }

    @Test void publicResultUsesImmutableAwardSnapshotAndIsHiddenBeforePublication() {
        work("a", 3, "10", "8"); service.autoAward(organizer, "c");
        assertThat(service.listPublicWinners("c", 1, 10).getData()).isEmpty();
        competition.setStatus(CompetitionStatus.AWARDED);
        assertThat(service.listPublicWinners("c", 1, 10).getData().getFirst().getTotalScore()).isEqualByComparingTo("9.00");
    }

    @Test void privateOrUnknownVisibilityNeverExposesAwardedWinnerMetadata() {
        competition.setStatus(CompetitionStatus.AWARDED);
        for (Boolean visibility : Arrays.asList(false, null)) {
            competition.setIsPublic(visibility);
            assertThatThrownBy(() -> service.listPublicWinners("c", 1, 10))
                    .isInstanceOf(BusinessException.class)
                    .extracting(error -> ((BusinessException) error).getStatus())
                    .isEqualTo(HttpStatus.NOT_FOUND);
        }
        verifyNoInteractions(submissions, users, winnerMapper);
    }

    @Test void privateWinnersRemainAvailableOnlyToActualOrganizersOrAdmins() {
        work("a", 3, "10", "8"); service.autoAward(organizer, "c");
        competition.setIsPublic(false); competition.setStatus(CompetitionStatus.AWARDED);
        assertThat(service.listManagedWinners(organizer, "c", 1, 10).getData()).hasSize(1);
        assertThat(service.listManagedWinners(new RequestContext("admin", "ADMIN"), "c", 1, 10).getData()).hasSize(1);
        assertThatThrownBy(() -> service.listManagedWinners(new RequestContext("stranger", "ORGANIZER"), "c", 1, 10))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Only organizers");
        assertThatThrownBy(() -> service.listManagedWinners(new RequestContext("owner", "PARTICIPANT"), "c", 1, 10))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Only organizers");
    }

    @Test void historicalWinnerRowsCannotPublishRejectedOrOtherCompetitionWorks() {
        work("rejected", 0, "0", "0"); work("foreign", 0, "0", "0"); work("public", 0, "0", "0");
        approved.getFirst().setReviewStatus("REJECTED"); approved.get(1).setCompetitionId("private-other");
        approved.forEach(s -> winners.add(new SubmissionWinners().setCompetitionId("c").setSubmissionId(s.getId()).setAwardName("Champion")));
        competition.setStatus(CompetitionStatus.AWARDED);
        var result = service.listPublicWinners("c", 1, 10);
        assertThat(result.getData()).extracting(WinnerInfoVO::getSubmissionId).containsExactly("public");
        assertThat(result.getData().getFirst().getTotalScore()).isNull();
        verify(users).getUsersByIds(List.of("upublic"), null);
    }

    @Test void publishedMetadataLookupsStayWithinTheHundredIdContract() {
        for (int i = 0; i < 101; i++) {
            String id = "s" + i; work(id, 0, "0", "0");
            winners.add(new SubmissionWinners().setCompetitionId("c").setSubmissionId(id).setAwardName("Best in A")
                    .setTotalScore(BigDecimal.TEN));
        }
        competition.setStatus(CompetitionStatus.AWARDED);
        assertThat(service.listPublicWinners("c", 2, 100).getData()).hasSize(1);
        verify(submissions, times(2)).getSubmissionsByIds(argThat(ids -> !ids.isEmpty() && ids.size() <= 100));
        verify(users, times(2)).getUsersByIds(argThat(ids -> !ids.isEmpty() && ids.size() <= 100), isNull());
    }

    @Test void unavailableAwardRecipientLookupFailsTheAwardTransaction() {
        work("a", 3, "10", "8"); when(users.getUserBriefById("ua")).thenReturn(null);
        assertThatThrownBy(() -> service.autoAward(organizer, "c")).hasMessageContaining("award recipient");
        // In production the enclosing local transaction also rolls back winners and run state.
        verifyNoInteractions(notifier);
    }

    @Test void paginationAndCriterionSortUseRealEligibilityRows() {
        work("a", 3, "10", "6"); work("b", 3, "8", "9");
        var list = service.listScoredSubmissions(organizer, "c", null, "B", "desc", 1, 1);
        assertThat(list.getData().getFirst().getSubmissionId()).isEqualTo("b"); assertThat(list.getPages()).isEqualTo(2);
        assertThatThrownBy(() -> service.listScoredSubmissions(organizer, "c", null, "B", "desc", 0, 1))
                .hasMessageContaining("Page must be positive");
    }
}
