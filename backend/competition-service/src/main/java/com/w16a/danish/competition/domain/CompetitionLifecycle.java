package com.w16a.danish.competition.domain;

import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;

/** Server-owned lifecycle; ordinary editing never reopens scoring or awards. */
public final class CompetitionLifecycle {
    private CompetitionLifecycle() {}

    public static void requireTransition(CompetitionStatus from, CompetitionStatus to, boolean awarding) {
        if (from == to) return;
        boolean allowed = switch (from) {
            case UPCOMING -> to == CompetitionStatus.ONGOING || to == CompetitionStatus.CANCELED;
            case ONGOING -> to == CompetitionStatus.COMPLETED || to == CompetitionStatus.CANCELED;
            case COMPLETED -> awarding ? to == CompetitionStatus.AWARDED : to == CompetitionStatus.CANCELED;
            case AWARDED, CANCELED -> false;
        };
        if (!allowed) throw new BusinessException(HttpStatus.CONFLICT, "Invalid competition transition: " + from + " -> " + to);
    }

    public static void requireDates(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null || !end.isAfter(start)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "End date must be after start date (UTC)");
        }
    }

    public static void requireCriteria(List<String> criteria) {
        if (criteria == null || criteria.isEmpty() || criteria.size() > 20
                || criteria.stream().anyMatch(c -> c == null || c.isBlank() || c.length() > 100 || !c.equals(c.trim()))
                || new HashSet<>(criteria).size() != criteria.size()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Provide 1–20 distinct scoring criteria, each 1–100 characters");
        }
    }
}
