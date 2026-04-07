package com.w16a.danish.judge.feign.fallback;

import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.judge.domain.vo.CompetitionResponseVO;
import com.w16a.danish.judge.feign.CompetitionServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class CompetitionServiceClientFallback implements CompetitionServiceClient {

    @Override
    public ResponseEntity<CompetitionResponseVO> getCompetitionById(String competitionId) {
        log.warn("[Fallback] competition-service unavailable — getCompetitionById id={}", competitionId);
        return ResponseEntity.ok(null);
    }

    @Override
    public ResponseEntity<List<CompetitionResponseVO>> getCompetitionsByIds(List<String> ids) {
        log.warn("[Fallback] competition-service unavailable — getCompetitionsByIds returning empty list");
        return ResponseEntity.ok(Collections.emptyList());
    }

    @Override
    public ResponseEntity<Boolean> isUserOrganizer(String competitionId, String userId) {
        log.warn("[Fallback] competition-service unavailable — isUserOrganizer returning false");
        return ResponseEntity.ok(false);
    }

    @Override
    public ResponseEntity<PageResponse<CompetitionResponseVO>> listMyCompetitions(String userId, String userRole, int page, int size) {
        log.warn("[Fallback] competition-service unavailable — listMyCompetitions returning empty page");
        return ResponseEntity.ok(new PageResponse<>(Collections.emptyList(), 0, page, size, 0));
    }

    @Override
    public ResponseEntity<List<CompetitionResponseVO>> listAllCompetitions() {
        log.warn("[Fallback] competition-service unavailable — listAllCompetitions returning empty list");
        return ResponseEntity.ok(Collections.emptyList());
    }

    @Override
    public ResponseEntity<CompetitionResponseVO> updateCompetitionStatus(String competitionId, String newStatus) {
        log.error("[Fallback] competition-service unavailable — updateCompetitionStatus failed id={}", competitionId);
        return ResponseEntity.ok(null);
    }
}
