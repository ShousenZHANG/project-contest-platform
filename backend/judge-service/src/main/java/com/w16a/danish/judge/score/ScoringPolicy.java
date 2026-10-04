package com.w16a.danish.judge.score;

import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.judge.domain.dto.CriterionScoreDTO;
import com.w16a.danish.judge.domain.po.SubmissionJudgeScores;
import com.w16a.danish.judge.domain.po.SubmissionJudges;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.judge.domain.vo.SubmissionInfoVO;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** The configured criterion set and its arithmetic mean are authoritative. */
public final class ScoringPolicy {
    public static final int MINIMUM_JUDGE_COUNT = 3;
    public static final int SCORE_SCHEMA_VERSION = 1;
    private static final BigDecimal MAX_SCORE = BigDecimal.TEN;

    private ScoringPolicy() { }

    public static List<String> criteria(List<String> configured) {
        if (configured == null || configured.isEmpty()
                || configured.stream().anyMatch(c -> c == null || c.isBlank())
                || new HashSet<>(configured).size() != configured.size()) {
            throw new BusinessException(HttpStatus.CONFLICT, "Competition scoring criteria are invalid.");
        }
        return List.copyOf(configured);
    }

    public static BigDecimal judgeMean(List<String> configured, List<CriterionScoreDTO> scores) {
        List<String> criteria = criteria(configured);
        if (scores == null || scores.size() != criteria.size()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Score every configured criterion exactly once.");
        }
        Set<String> received = new HashSet<>();
        BigDecimal sum = BigDecimal.ZERO;
        for (CriterionScoreDTO score : scores) {
            if (score == null || !criteria.contains(score.getCriterion()) || !received.add(score.getCriterion())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Score every configured criterion exactly once.");
            }
            if (!validScore(score.getScore())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Criterion scores must be between 0 and 10.");
            }
            if (score.getScore().scale() > 2) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Criterion scores must have at most two decimal places.");
            }
            sum = sum.add(score.getScore());
        }
        return mean(sum, criteria.size());
    }

    public static BigDecimal equalWeight(int criterionCount) {
        return BigDecimal.ONE.divide(BigDecimal.valueOf(criterionCount), 10, RoundingMode.HALF_UP);
    }

    public static void requireApprovedSubmission(CompetitionResponseVO competition, SubmissionInfoVO submission) {
        if (!Objects.equals(competition.getId(), submission.getCompetitionId())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Submission does not belong to this competition.");
        }
        if (!"APPROVED".equals(submission.getReviewStatus())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only approved submissions can be scored or awarded.");
        }
        if (submission.getRevision() == null || submission.getRevision() < 0) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Submission revision is missing or invalid.");
        }
        String type = competition.getParticipationType() == null ? "" : competition.getParticipationType().name();
        boolean individual = "INDIVIDUAL".equals(type) && hasText(submission.getUserId()) && !hasText(submission.getTeamId());
        boolean team = "TEAM".equals(type) && hasText(submission.getTeamId()) && !hasText(submission.getUserId());
        if (!individual && !team) {
            throw new BusinessException(HttpStatus.CONFLICT, "Submission ownership does not match competition participation type.");
        }
    }

    private static boolean hasText(String value) { return value != null && !value.isBlank(); }

    /** Invalid, removed and duplicated Judge records do not count toward eligibility. */
    public static Summary summarize(String competitionId, String submissionId, int submissionRevision, List<String> configured,
                                    List<SubmissionJudges> records, List<SubmissionJudgeScores> details,
                                    Set<String> validJudgeIds) {
        List<String> criteria = criteria(configured);
        Map<String, List<SubmissionJudgeScores>> byRecord = details.stream()
                .filter(d -> Objects.equals(submissionId, d.getSubmissionId()) && d.getJudgeRecordId() != null)
                .collect(Collectors.groupingBy(SubmissionJudgeScores::getJudgeRecordId));
        Map<String, List<SubmissionJudges>> byJudge = records.stream()
                .filter(r -> Objects.equals(competitionId, r.getCompetitionId())
                        && Objects.equals(submissionId, r.getSubmissionId())
                        && isCurrentScore(r, submissionRevision)
                        && validJudgeIds.contains(r.getJudgeId()) && r.getId() != null)
                .collect(Collectors.groupingBy(SubmissionJudges::getJudgeId));
        Map<String, BigDecimal> sums = criteria.stream()
                .collect(Collectors.toMap(Function.identity(), ignored -> BigDecimal.ZERO, (a, b) -> a, LinkedHashMap::new));
        int judges = 0;
        for (List<SubmissionJudges> duplicates : byJudge.values()) {
            if (duplicates.size() != 1) continue;
            List<SubmissionJudgeScores> judgeScores = byRecord.getOrDefault(duplicates.getFirst().getId(), List.of());
            if (!isCompleteCurrentScore(duplicates.getFirst(), submissionRevision, criteria, judgeScores)) continue;
            judges++;
            for (SubmissionJudgeScores detail : judgeScores) {
                sums.compute(detail.getCriterion(), (key, sum) -> sum.add(detail.getScore()));
            }
        }
        if (judges == 0) return new Summary(0, null, Map.of());
        int count = judges;
        Map<String, BigDecimal> criterionMeans = new LinkedHashMap<>();
        sums.forEach((criterion, sum) -> criterionMeans.put(criterion, mean(sum, count)));
        // Divide the raw sum once: do not average already rounded Judge totals.
        BigDecimal total = mean(sums.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add),
                Math.multiplyExact(judges, criteria.size()));
        return new Summary(judges, total, Collections.unmodifiableMap(criterionMeans));
    }

    public static boolean isCurrentScore(SubmissionJudges record, int submissionRevision) {
        return record != null && Objects.equals(record.getSubmissionRevision(), submissionRevision)
                && Objects.equals(record.getScoreSchemaVersion(), SCORE_SCHEMA_VERSION);
    }

    /** A current metadata version is insufficient without every persisted criterion. */
    public static boolean isCompleteCurrentScore(SubmissionJudges record, int submissionRevision,
            List<String> configured, List<SubmissionJudgeScores> details) {
        if (!isCurrentScore(record, submissionRevision) || record.getId() == null || details == null) return false;
        List<String> criteria = criteria(configured);
        List<SubmissionJudgeScores> ownDetails = details.stream()
                .filter(Objects::nonNull)
                .filter(d -> Objects.equals(record.getId(), d.getJudgeRecordId())).toList();
        if (ownDetails.size() != criteria.size()) return false;
        Set<String> seen = new HashSet<>();
        return ownDetails.stream().allMatch(d -> Objects.equals(record.getSubmissionId(), d.getSubmissionId())
                && criteria.contains(d.getCriterion()) && seen.add(d.getCriterion())
                && validScore(d.getScore()) && d.getScore().scale() <= 2);
    }

    private static boolean validScore(BigDecimal score) {
        return score != null && score.compareTo(BigDecimal.ZERO) >= 0 && score.compareTo(MAX_SCORE) <= 0;
    }

    private static BigDecimal mean(BigDecimal sum, int count) {
        return sum.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
    }

    public record Summary(int judgeCount, BigDecimal totalScore, Map<String, BigDecimal> criterionScores) { }
}
