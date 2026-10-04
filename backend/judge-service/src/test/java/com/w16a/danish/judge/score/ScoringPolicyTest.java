package com.w16a.danish.judge.score;

import com.w16a.danish.common.domain.enums.ParticipationType;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.judge.domain.dto.CriterionScoreDTO;
import com.w16a.danish.judge.domain.po.SubmissionJudgeScores;
import com.w16a.danish.judge.domain.po.SubmissionJudges;
import com.w16a.danish.judge.domain.vo.SubmissionInfoVO;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class ScoringPolicyTest {
    private CriterionScoreDTO item(String criterion, String score, String weight) {
        CriterionScoreDTO dto = new CriterionScoreDTO();
        dto.setCriterion(criterion);
        dto.setScore(new BigDecimal(score));
        dto.setWeight(weight == null ? null : new BigDecimal(weight));
        return dto;
    }

    @Test void serverMeanIgnoresMissingAndForgedWeights() {
        assertThat(ScoringPolicy.judgeMean(List.of("A", "B", "C"),
                List.of(item("A", "1", "100"), item("B", "1", null), item("C", "2", "-8"))))
                .isEqualByComparingTo("1.33");
    }

    @Test void rejectsMissingDuplicateAndUnknownCriteria() {
        for (List<CriterionScoreDTO> scores : List.of(List.of(item("A", "5", null)),
                List.of(item("A", "5", null), item("A", "5", null)),
                List.of(item("A", "5", null), item("X", "5", null)))) {
            assertThatThrownBy(() -> ScoringPolicy.judgeMean(List.of("A", "B"), scores))
                    .hasMessageContaining("exactly once");
        }
    }

    @Test void enforcesZeroToTenAtBusinessBoundary() {
        assertThat(ScoringPolicy.judgeMean(List.of("A", "B"), List.of(item("A", "0", null), item("B", "10", null))))
                .isEqualByComparingTo("5.00");
        for (String invalid : List.of("-0.1", "10.01", "100")) {
            assertThatThrownBy(() -> ScoringPolicy.judgeMean(List.of("A"), List.of(item("A", invalid, null))))
                    .hasMessageContaining("between 0 and 10");
        }
    }

    @Test void validatesConfiguredCriteria() {
        assertThatThrownBy(() -> ScoringPolicy.criteria(List.of())).hasMessageContaining("invalid");
        assertThatThrownBy(() -> ScoringPolicy.criteria(List.of("A", "A"))).hasMessageContaining("invalid");
        assertThatThrownBy(() -> ScoringPolicy.criteria(List.of(" "))).hasMessageContaining("invalid");
    }

    @Test void rejectsPrecisionThatWouldBeRoundedByCriterionStorage() {
        assertThatThrownBy(() -> ScoringPolicy.judgeMean(List.of("A"), List.of(item("A", "8.333", null))))
                .hasMessageContaining("two decimal places");
        assertThatThrownBy(() -> ScoringPolicy.judgeMean(List.of("A"), List.of(item("A", "1E-1000000", null))))
                .hasMessageContaining("two decimal places");
    }

    @Test void totalsRoundOnlyOnceFromRawCriterionScores() {
        List<SubmissionJudges> records = new ArrayList<>();
        List<SubmissionJudgeScores> details = new ArrayList<>();
        for (int j = 0; j < 3; j++) {
            records.add(record("r" + j, "j" + j));
            for (String criterion : List.of("A", "B", "C")) {
                String value = j == 2 && criterion.equals("C") ? "0.08" : "0";
                details.add(detail("r" + j, criterion, value));
            }
        }
        var summary = ScoringPolicy.summarize("c", "s", 0, List.of("A", "B", "C"), records, details,
                Set.of("j0", "j1", "j2"));
        assertThat(summary.judgeCount()).isEqualTo(3);
        assertThat(summary.totalScore()).isEqualByComparingTo("0.01");
        assertThat(summary.criterionScores().get("C")).isEqualByComparingTo("0.03");
    }

    @Test void excludesRemovedNonJudgeIncompleteAndOutOfRangeRecords() {
        List<SubmissionJudges> records = List.of(record("good", "j1"), record("removed", "j2"),
                record("incomplete", "j3"), record("bad", "j4"));
        List<SubmissionJudgeScores> details = List.of(detail("good", "A", "10"), detail("good", "B", "6"),
                detail("removed", "A", "10"), detail("removed", "B", "10"),
                detail("incomplete", "A", "5"), detail("bad", "A", "100"), detail("bad", "B", "5"));
        var summary = ScoringPolicy.summarize("c", "s", 0, List.of("A", "B"), records, details, Set.of("j1", "j3", "j4"));
        assertThat(summary.judgeCount()).isEqualTo(1);
        assertThat(summary.totalScore()).isEqualByComparingTo("8.00");
    }

    @Test void duplicateJudgeAndCriterionRowsDoNotSatisfyMinimum() {
        List<SubmissionJudges> records = List.of(record("r1", "j1"), record("r2", "j1"), record("r3", "j2"));
        List<SubmissionJudgeScores> details = List.of(detail("r1", "A", "10"), detail("r1", "B", "10"),
                detail("r2", "A", "10"), detail("r2", "B", "10"),
                detail("r3", "A", "10"), detail("r3", "A", "10"));
        var summary = ScoringPolicy.summarize("c", "s", 0, List.of("A", "B"), records, details, Set.of("j1", "j2"));
        assertThat(summary.judgeCount()).isZero();
        assertThat(summary.totalScore()).isNull();
    }

    @Test void currentRecordRequiresCompleteMatchingPersistedCriteria() {
        var record = record("r", "j");
        var a = detail("r", "A", "8"); var b = detail("r", "B", "6");
        assertThat(ScoringPolicy.isCompleteCurrentScore(record, 0, List.of("A", "B"), List.of(a, b))).isTrue();
        assertThat(ScoringPolicy.isCompleteCurrentScore(record, 0, List.of("A", "B"), List.of(a))).isFalse();
        b.setSubmissionId("another");
        assertThat(ScoringPolicy.isCompleteCurrentScore(record, 0, List.of("A", "B"), List.of(a, b))).isFalse();
        b.setSubmissionId("s").setScore(new BigDecimal("6.333"));
        assertThat(ScoringPolicy.isCompleteCurrentScore(record, 0, List.of("A", "B"), List.of(a, b))).isFalse();
    }

    @Test void legacyScaleAndReplacedFilesNeverQualifyEvenWithLowNumbers() {
        var legacy = record("old", "j1").setScoreSchemaVersion(0);
        var previousFile = record("replaced", "j2").setSubmissionRevision(0);
        var current = record("current", "j3").setSubmissionRevision(1);
        var details = List.of(detail("old", "A", "8"), detail("replaced", "A", "10"), detail("current", "A", "6"));
        var summary = ScoringPolicy.summarize("c", "s", 1, List.of("A"), List.of(legacy, previousFile, current), details,
                Set.of("j1", "j2", "j3"));
        assertThat(summary.judgeCount()).isEqualTo(1);
        assertThat(summary.totalScore()).isEqualByComparingTo("6.00");
    }

    @Test void reviewCompetitionAndParticipationShapeMustMatch() {
        CompetitionResponseVO competition = new CompetitionResponseVO();
        competition.setId("c"); competition.setParticipationType(ParticipationType.INDIVIDUAL);
        SubmissionInfoVO submission = new SubmissionInfoVO();
        submission.setCompetitionId("other"); submission.setReviewStatus("APPROVED"); submission.setUserId("u");
        assertThatThrownBy(() -> ScoringPolicy.requireApprovedSubmission(competition, submission)).hasMessageContaining("does not belong");
        submission.setCompetitionId("c"); submission.setReviewStatus("PENDING");
        assertThatThrownBy(() -> ScoringPolicy.requireApprovedSubmission(competition, submission)).hasMessageContaining("approved");
        submission.setReviewStatus("APPROVED"); submission.setTeamId("t");
        assertThatThrownBy(() -> ScoringPolicy.requireApprovedSubmission(competition, submission)).hasMessageContaining("ownership");
        submission.setUserId(null); competition.setParticipationType(ParticipationType.TEAM);
        assertThatCode(() -> ScoringPolicy.requireApprovedSubmission(competition, submission)).doesNotThrowAnyException();
    }

    private SubmissionJudges record(String id, String judge) {
        return new SubmissionJudges().setId(id).setSubmissionId("s").setCompetitionId("c")
                .setJudgeId(judge).setScoreSchemaVersion(1).setTotalScore(new BigDecimal("999"));
    }
    private SubmissionJudgeScores detail(String record, String criterion, String score) {
        return new SubmissionJudgeScores().setJudgeRecordId(record).setSubmissionId("s")
                .setCriterion(criterion).setScore(new BigDecimal(score)).setWeight(new BigDecimal("100"));
    }
}
