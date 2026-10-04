package com.w16a.danish.registration.service;

import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.mapper.SubmissionRecordsMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

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
        for (int start = 0; start < ids.size(); start += 100) {
            submissions.selectCurrentScoreIds(ids.subList(start, Math.min(start + 100, ids.size())))
                    .forEach(id -> visible.put(id, candidates.get(id)));
        }
        return visible;
    }

    private static boolean hasCurrentProjection(SubmissionRecords record) {
        return record.getId() != null && "APPROVED".equals(record.getReviewStatus())
                && record.getScoreVersion() != null && record.getScoreVersion() > 0
                && record.getRevision() != null && record.getRevision() >= 0
                && record.getTotalScore() != null && record.getTotalScore().signum() >= 0
                && record.getTotalScore().compareTo(BigDecimal.TEN) <= 0;
    }
}
