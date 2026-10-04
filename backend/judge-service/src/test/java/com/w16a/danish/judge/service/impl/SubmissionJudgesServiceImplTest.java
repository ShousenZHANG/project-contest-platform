package com.w16a.danish.judge.service.impl;

import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.common.domain.enums.*;
import com.w16a.danish.common.domain.vo.*;
import com.w16a.danish.judge.domain.dto.*;
import com.w16a.danish.judge.domain.po.*;
import com.w16a.danish.judge.domain.vo.*;
import com.w16a.danish.judge.feign.SubmissionServiceClient;
import com.w16a.danish.judge.gateway.CompetitionGateway;
import com.w16a.danish.judge.mapper.*;
import com.w16a.danish.judge.service.*;
import org.junit.jupiter.api.*;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SubmissionJudgesServiceImplTest {
    private final CompetitionGateway competitions = mock(CompetitionGateway.class);
    private final SubmissionServiceClient submissions = mock(SubmissionServiceClient.class);
    private final ICompetitionJudgesService assignments = mock(ICompetitionJudgesService.class);
    private final ISubmissionJudgeScoresService scores = mock(ISubmissionJudgeScoresService.class);
    private final SubmissionJudgesMapper mapper = mock(SubmissionJudgesMapper.class);
    private final AwardRunMapper runs = mock(AwardRunMapper.class);
    private final DurableTasks tasks = mock(DurableTasks.class);
    private SubmissionJudgesServiceImpl service;
    private LambdaQueryChainWrapper<SubmissionJudges> query;
    private CompetitionResponseVO competition;
    private SubmissionInfoVO submission;
    private final List<SubmissionJudges> records = new ArrayList<>();
    private final List<SubmissionJudgeScores> details = new ArrayList<>();
    private final RequestContext judge = new RequestContext("judge", "JUDGE");

    @BeforeEach @SuppressWarnings("unchecked") void setUp() {
        service = spy(new SubmissionJudgesServiceImpl(assignments, scores, competitions, submissions, runs, tasks));
        ReflectionTestUtils.setField(service, "baseMapper", mapper);
        query = fluentQuery();
        doReturn(query).when(service).lambdaQuery();
        when(query.list()).thenAnswer(call -> List.copyOf(records));
        when(query.one()).thenAnswer(call -> records.isEmpty() ? null : records.getFirst());
        doAnswer(call -> { records.add(call.getArgument(0)); return true; }).when(service).save(any(SubmissionJudges.class));
        doReturn(true).when(service).updateById(any(SubmissionJudges.class));
        when(scores.saveBatch(anyCollection())).thenAnswer(call -> { details.addAll(call.getArgument(0)); return true; });
        when(scores.listBySubmissionIds(anyList())).thenAnswer(call -> List.copyOf(details));
        when(scores.remove(any())).thenAnswer(call -> { details.clear(); return true; });
        competition = new CompetitionResponseVO();
        competition.setId("c"); competition.setName("Competition"); competition.setStatus(CompetitionStatus.COMPLETED);
        competition.setParticipationType(ParticipationType.INDIVIDUAL); competition.setScoringCriteria(List.of("A", "B"));
        when(competitions.require("c")).thenReturn(competition);
        when(mapper.selectValidJudgeIds("c")).thenReturn(Set.of("judge", "j2", "j3"));
        when(runs.incrementScoreVersion("c")).thenReturn(1);
        when(runs.scoreVersion("c")).thenReturn(1L);
        submission = new SubmissionInfoVO();
        submission.setId("s"); submission.setCompetitionId("c"); submission.setUserId("participant");
        submission.setReviewStatus("APPROVED"); submission.setTitle("Submission");
        when(submissions.getSubmissionsByIds(List.of("s"))).thenReturn(ResponseEntity.ok(List.of(submission)));
        when(submissions.getApprovedSubmissions("c")).thenReturn(ResponseEntity.ok(List.of(submission)));
    }

    private SubmissionJudgeDTO dto() {
        SubmissionJudgeDTO dto = new SubmissionJudgeDTO(); dto.setCompetitionId("c"); dto.setSubmissionId("s");
        CriterionScoreDTO a = new CriterionScoreDTO(); a.setCriterion("A"); a.setScore(BigDecimal.TEN); a.setWeight(new BigDecimal("100"));
        CriterionScoreDTO b = new CriterionScoreDTO(); b.setCriterion("B"); b.setScore(BigDecimal.ZERO);
        dto.setScores(List.of(a, b)); return dto;
    }

    @Test void savesServerMeanAndPropagatesAuthoritativeScore() {
        service.judgeSubmission(judge, dto());
        assertThat(records).hasSize(1);
        assertThat(records.getFirst().getTotalScore()).isEqualByComparingTo("5.00");
        assertThat(details).hasSize(2).allSatisfy(d -> assertThat(d.getWeight()).isEqualByComparingTo("0.5"));
        verify(tasks).enqueue("SUBMISSION_SCORE", "s", 1L, Map.of("score", new BigDecimal("5.00"), "revision", 0));
        verify(runs).incrementScoreVersion("c");
    }

    @Test void participantCannotScoreEvenWithAnAssignment() {
        assertThatThrownBy(() -> service.judgeSubmission(new RequestContext("judge", "PARTICIPANT"), dto()))
                .hasMessageContaining("required role");
        assertThat(records).isEmpty();
    }

    @Test void removedOrNonJudgeAssignmentIsRejected() {
        when(mapper.selectValidJudgeIds("c")).thenReturn(Set.of("j2"));
        assertThatThrownBy(() -> service.judgeSubmission(judge, dto())).hasMessageContaining("not assigned");
        assertThat(records).isEmpty();
    }

    @Test void expiredOngoingCompetitionStillCannotBeScored() {
        competition.setStatus(CompetitionStatus.ONGOING); competition.setEndDate(LocalDateTime.now().minusDays(1));
        assertThatThrownBy(() -> service.judgeSubmission(judge, dto())).hasMessageContaining("not completed");
    }

    @Test void awardedCompetitionAndLocalCommittedRunAreImmutable() {
        competition.setStatus(CompetitionStatus.AWARDED);
        assertThatThrownBy(() -> service.judgeSubmission(judge, dto())).hasMessageContaining("not completed");
        competition.setStatus(CompetitionStatus.COMPLETED);
        when(runs.lockRun("c")).thenReturn(LocalDateTime.now());
        assertThatThrownBy(() -> service.judgeSubmission(judge, dto())).hasMessageContaining("immutable");
    }

    @Test void rejectsCrossCompetitionAndUnapprovedSubmission() {
        submission.setCompetitionId("other");
        assertThatThrownBy(() -> service.judgeSubmission(judge, dto())).hasMessageContaining("does not belong");
        submission.setCompetitionId("c"); submission.setReviewStatus("REJECTED");
        assertThatThrownBy(() -> service.judgeSubmission(judge, dto())).hasMessageContaining("approved");
    }

    @Test void rejectsWrongParticipationShapeAndUnknownCriteria() {
        competition.setParticipationType(ParticipationType.TEAM);
        assertThatThrownBy(() -> service.judgeSubmission(judge, dto())).hasMessageContaining("ownership");
        competition.setParticipationType(ParticipationType.INDIVIDUAL);
        var body = dto(); body.getScores().getFirst().setCriterion("fake");
        assertThatThrownBy(() -> service.judgeSubmission(judge, body)).hasMessageContaining("exactly once");
    }

    @Test void duplicateJudgementIsConflict() {
        service.judgeSubmission(judge, dto());
        assertThatThrownBy(() -> service.judgeSubmission(judge, dto())).hasMessageContaining("already judged");
        assertThat(records).hasSize(1);
    }

    @Test void replacementInvalidatesContextAndPostRescoresTheSameUniqueRecord() {
        service.judgeSubmission(judge, dto());
        String original = records.getFirst().getId();
        submission.setRevision(1);
        assertThat(service.getJudgingSubmission(judge, "c", "s").isHasScored()).isFalse();
        assertThat(service.getJudgingSubmission(judge, "c", "s").isRequiresRescore()).isTrue();
        var body = dto(); body.getScores().getLast().setScore(new BigDecimal("8"));
        service.judgeSubmission(judge, body);
        assertThat(records).hasSize(1);
        assertThat(records.getFirst().getId()).isEqualTo(original);
        assertThat(records.getFirst().getSubmissionRevision()).isEqualTo(1);
        assertThat(records.getFirst().getScoreSchemaVersion()).isEqualTo(1);
        assertThat(records.getFirst().getTotalScore()).isEqualByComparingTo("9.00");
        assertThat(details).hasSize(2);
        assertThat(service.getJudgingSubmission(judge, "c", "s").isHasScored()).isTrue();
    }

    @Test @SuppressWarnings("unchecked") void legacyDetailsRequireRescoringAndNeverReceiveAFalseTenPointLabel() {
        records.add(new SubmissionJudges().setId("old").setCompetitionId("c").setSubmissionId("s")
                .setJudgeId("judge").setTotalScore(new BigDecimal("8")));
        details.add(new SubmissionJudgeScores().setJudgeRecordId("old").setSubmissionId("s").setCriterion("A")
                .setScore(new BigDecimal("100")).setWeight(new BigDecimal("1")));
        var detailQuery = SubmissionJudgesServiceImplTest.<SubmissionJudgeScores>fluentQuery();
        doReturn(detailQuery).when(scores).lambdaQuery();
        when(detailQuery.list()).thenAnswer(call -> List.copyOf(details));
        var detail = service.getMyJudgingDetail("judge", "s");
        assertThat(detail.isRequiresRescore()).isTrue(); assertThat(detail.getTotalScore()).isNull();
        assertThat(detail.getScores().getFirst().getWeight()).isNull();
        assertThat(service.getJudgingSubmission(judge, "c", "s").isHasScored()).isFalse();
        service.judgeSubmission(judge, dto());
        assertThat(records).hasSize(1); assertThat(records.getFirst().getId()).isEqualTo("old");
        assertThat(records.getFirst().getScoreSchemaVersion()).isEqualTo(1);
        assertThat(service.getMyJudgingDetail("judge", "s").getTotalScore()).isEqualByComparingTo("5.00");
    }

    @Test void missingSubmissionAndFailedReadDoNotWrite() {
        when(submissions.getSubmissionsByIds(List.of("s"))).thenReturn(ResponseEntity.ok(List.of()));
        assertThatThrownBy(() -> service.judgeSubmission(judge, dto())).hasMessageContaining("not found");
        when(submissions.getSubmissionsByIds(List.of("s"))).thenReturn(null);
        assertThatThrownBy(() -> service.judgeSubmission(judge, dto())).hasMessageContaining("returned no data");
        assertThat(records).isEmpty();
    }

    @Test void persistenceFailureDoesNotSendAProjection() {
        doReturn(false).when(service).save(any(SubmissionJudges.class));
        assertThatThrownBy(() -> service.judgeSubmission(judge, dto())).hasMessageContaining("save judge record");
        verify(tasks, never()).enqueue(anyString(), anyString(), any(), any());
    }

    @Test void detailsFailureDoesNotSendAProjection() {
        when(scores.saveBatch(anyCollection())).thenReturn(false);
        assertThatThrownBy(() -> service.judgeSubmission(judge, dto())).hasMessageContaining("score details");
        verify(tasks, never()).enqueue(anyString(), anyString(), any(), any());
    }

    @Test void updatingChecksPathAndBodyBeforeWritingAnything() {
        assertThatThrownBy(() -> service.updateJudgement(judge, "other", dto())).hasMessageContaining("must match");
        verify(service, never()).updateById(any(SubmissionJudges.class));
    }

    @Test void updatesOwnScoreWithSameEligibilityAndServerMean() {
        service.judgeSubmission(judge, dto());
        var body = dto(); body.getScores().getLast().setScore(new BigDecimal("8"));
        service.updateJudgement(judge, "s", body);
        assertThat(records.getFirst().getTotalScore()).isEqualByComparingTo("9.00");
        assertThat(details).hasSize(2);
        verify(tasks).enqueue("SUBMISSION_SCORE", "s", 1L, Map.of("score", new BigDecimal("9.00"), "revision", 0));
    }

    @Test void missingOriginalJudgementAndRemovedAssignmentCannotUpdate() {
        assertThatThrownBy(() -> service.updateJudgement(judge, "s", dto())).hasMessageContaining("No existing");
        when(mapper.selectValidJudgeIds("c")).thenReturn(Set.of());
        assertThatThrownBy(() -> service.updateJudgement(judge, "s", dto())).hasMessageContaining("not assigned");
    }

    @Test void contextIncludesCriteriaAndReadOnlyAwardState() {
        var context = service.getJudgingSubmission(judge, "c", "s");
        assertThat(context.getScoringCriteria()).containsExactly("A", "B");
        assertThat(context.isCanScore()).isTrue();
        competition.setStatus(CompetitionStatus.AWARDED);
        context = service.getJudgingSubmission(judge, "c", "s");
        assertThat(context.getCompetitionStatus()).isEqualTo("AWARDED");
        assertThat(context.isCanScore()).isFalse();
    }

    @Test @SuppressWarnings("unchecked") void assignedJudgeReadsOwnDetailsAndSubmissionQueue() {
        service.judgeSubmission(judge, dto());
        var detailQuery = SubmissionJudgesServiceImplTest.<SubmissionJudgeScores>fluentQuery();
        doReturn(detailQuery).when(scores).lambdaQuery();
        when(detailQuery.list()).thenReturn(details);
        assertThat(service.getMyJudgingDetail("judge", "s").getTotalScore()).isEqualByComparingTo("5.00");
        competition.setIsPublic(false);
        assertThat(service.listPendingSubmissionsForJudging(judge, "c", null, "desc", 1, 10).getData())
                .hasSize(1).allSatisfy(row -> assertThat(row.getHasScored()).isTrue());
        verify(submissions).getApprovedSubmissions("c");
    }

    @Test void privateQueueKeepsTotalWhenPageIsPastTheEndAndRejectsForeignMetadata() {
        competition.setIsPublic(false);
        var page = service.listPendingSubmissionsForJudging(judge, "c", null, "desc", 2, 10);
        assertThat(page.getData()).isEmpty(); assertThat(page.getTotal()).isEqualTo(1);
        assertThat(page.getPages()).isEqualTo(1);
        submission.setCompetitionId("private-other");
        assertThatThrownBy(() -> service.listPendingSubmissionsForJudging(judge, "c", null, "desc", 1, 10))
                .hasMessageContaining("does not belong");
    }

    @Test void incompleteCurrentRecordCanBeRescoredInsteadOfLeavingTheJudgeBlocked() {
        service.judgeSubmission(judge, dto());
        String id = records.getFirst().getId(); details.removeLast();
        var context = service.getJudgingSubmission(judge, "c", "s");
        assertThat(context.isHasScored()).isFalse(); assertThat(context.isRequiresRescore()).isTrue();
        service.judgeSubmission(judge, dto());
        assertThat(records).hasSize(1); assertThat(records.getFirst().getId()).isEqualTo(id);
        assertThat(details).hasSize(2);
        assertThat(service.getJudgingSubmission(judge, "c", "s").isHasScored()).isTrue();
    }

    @Test void assignmentPredicateRequiresCompletedAndCurrentValidJudge() {
        assertThat(service.isUserAssignedAsJudge("judge", "c")).isTrue();
        competition.setStatus(CompetitionStatus.ONGOING);
        assertThat(service.isUserAssignedAsJudge("judge", "c")).isFalse();
    }

    @Test @SuppressWarnings("unchecked") void myCompetitionListRequiresJudgeAndValidAssignment() {
        var assignmentQuery = SubmissionJudgesServiceImplTest.<CompetitionJudges>fluentQuery();
        doReturn(assignmentQuery).when(assignments).lambdaQuery();
        when(assignmentQuery.list()).thenReturn(List.of(new CompetitionJudges().setCompetitionId("c")));
        when(competitions.findAll(List.of("c"))).thenReturn(List.of(competition));
        assertThat(service.listMyJudgingCompetitions(judge, null, "createdAt", "desc", 1, 10).getData()).hasSize(1);
        assertThatThrownBy(() -> service.listMyJudgingCompetitions(new RequestContext("judge", "PARTICIPANT"),
                null, "createdAt", "desc", 1, 10)).hasMessageContaining("required role");
    }

    @Test void badPageCannotReachTheDatabase() {
        assertThatThrownBy(() -> service.listPendingSubmissionsForJudging(judge, "c", null, "desc", 0, 10))
                .hasMessageContaining("Page must be positive");
    }

    @SuppressWarnings("unchecked")
    private static <T> LambdaQueryChainWrapper<T> fluentQuery() {
        return mock(LambdaQueryChainWrapper.class, invocation -> {
            var result = RETURNS_SELF.answer(invocation);
            // MyBatis-Plus generic bridge methods return Object; Mockito's self answer excludes it.
            if (result == null && Set.of("eq", "in", "select").contains(invocation.getMethod().getName())) {
                return invocation.getMock();
            }
            return result;
        });
    }
}
