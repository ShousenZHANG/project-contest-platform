package com.w16a.danish.registration.service;

import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.domain.po.SubmissionScoreSource;
import com.w16a.danish.registration.mapper.SubmissionRecordsMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;

/** A legacy number is not a current score until its version and Judge source are established. */
@Component
@RequiredArgsConstructor
public class SubmissionScores {
    private final SubmissionRecordsMapper submissions;

    public BigDecimal visibleScore(SubmissionRecords record) {
        return record == null ? null : visibleScores(List.of(record)).get(record.getId());
    }

    public Map<String, BigDecimal> visibleScores(Collection<SubmissionRecords> records) {
        Map<String, BigDecimal> candidates = new HashMap<>();
        records.stream().filter(Objects::nonNull).filter(SubmissionScores::hasCurrentProjection)
                .forEach(record -> candidates.put(record.getId(), record.getTotalScore()));
        List<String> ids = List.copyOf(candidates.keySet());
        Map<String, BigDecimal> visible = new HashMap<>();
        currentIds(ids).forEach(id -> visible.put(id, candidates.get(id)));
        return visible;
    }

    /** Keep pagination in SQL, with the exact same evidence policy as VO/statistics. */
    public String currentScoreOrder(String competitionId, boolean ascending, Map<String, Object> parameters) {
        List<String> valid = currentIds(submissions.selectScoreCandidateIds(competitionId)).stream().sorted().toList();
        String direction = ascending ? " ASC" : " DESC";
        if (valid.isEmpty()) return "NULL" + direction;
        List<String> bindings = new ArrayList<>();
        for (int index = 0; index < valid.size(); index++) {
            String key = "currentScoreId" + index;
            parameters.put(key, valid.get(index));
            bindings.add("#{ew.paramNameValuePairs." + key + "}");
        }
        return "CASE WHEN submission_records.id IN (" + String.join(",", bindings) + ") AND ("
                + SubmissionRecordsMapper.CURRENT_SCORE + ") IS NOT NULL THEN submission_records.total_score ELSE NULL END" + direction;
    }

    private Set<String> currentIds(List<String> ids) {
        Set<String> current = new HashSet<>();
        for (int start = 0; start < ids.size(); start += 100) {
            List<SubmissionScoreSource> sources = submissions.selectScoreSources(ids.subList(start, Math.min(start + 100, ids.size())));
            Map<String, List<SubmissionScoreSource>> bySubmission = sources.stream()
                    .filter(Objects::nonNull).filter(row -> row.getSubmissionId() != null)
                    .collect(Collectors.groupingBy(SubmissionScoreSource::getSubmissionId));
            bySubmission.forEach((id, rows) -> {
                if (hasValidJudge(rows)) current.add(id);
            });
        }
        return current;
    }

    private static boolean hasValidJudge(List<SubmissionScoreSource> sources) {
        Map<String, Map<String, List<SubmissionScoreSource>>> byJudge = new LinkedHashMap<>();
        for (SubmissionScoreSource row : sources) {
            if (row.getJudgeId() == null || row.getJudgeRecordId() == null) continue;
            byJudge.computeIfAbsent(row.getJudgeId(), ignored -> new LinkedHashMap<>())
                    .computeIfAbsent(row.getJudgeRecordId(), ignored -> new ArrayList<>()).add(row);
        }
        return byJudge.values().stream().anyMatch(records -> records.size() == 1
                && isCompleteRecord(records.values().iterator().next()));
    }

    private static boolean isCompleteRecord(List<SubmissionScoreSource> rows) {
        SubmissionScoreSource first = rows.getFirst();
        Set<String> configured = criteria(first.getConfiguredCriteria());
        if (configured.isEmpty() || rows.size() != configured.size() || !validScore(first.getJudgeTotal())) return false;
        Set<String> seen = new HashSet<>();
        return rows.stream().allMatch(row -> row.getDetailId() != null
                && Objects.equals(first.getConfiguredCriteria(), row.getConfiguredCriteria())
                && Objects.equals(first.getSubmissionId(), row.getDetailSubmissionId())
                && configured.contains(row.getCriterion()) && seen.add(row.getCriterion())
                && validScore(row.getCriterionScore())
                && row.getCriterionScore().stripTrailingZeros().scale() <= 2);
    }

    private static Set<String> criteria(String json) {
        if (json == null) return Set.of();
        try {
            var values = cn.hutool.json.JSONUtil.parseArray(json);
            if (values.isEmpty() || values.size() > 20) return Set.of();
            Set<String> criteria = new HashSet<>();
            for (Object value : values) {
                if (!(value instanceof String name) || name.isBlank() || name.length() > 100
                        || !name.equals(name.trim()) || !criteria.add(name)) return Set.of();
            }
            return criteria;
        } catch (RuntimeException invalid) {
            return Set.of();
        }
    }

    private static boolean validScore(BigDecimal value) {
        return value != null && value.signum() >= 0 && value.compareTo(BigDecimal.TEN) <= 0;
    }

    private static boolean hasCurrentProjection(SubmissionRecords record) {
        return record.getId() != null && "APPROVED".equals(record.getReviewStatus())
                && record.getScoreVersion() != null && record.getScoreVersion() > 0
                && record.getRevision() != null && record.getRevision() >= 0
                && record.getTotalScore() != null && record.getTotalScore().signum() >= 0
                && record.getTotalScore().compareTo(BigDecimal.TEN) <= 0;
    }
}
