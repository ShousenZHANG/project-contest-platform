package com.w16a.danish.registration.feign.fallback;

import com.w16a.danish.registration.domain.vo.CompetitionResponseVO;
import com.w16a.danish.registration.feign.CompetitionServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class CompetitionServiceClientFallback implements CompetitionServiceClient {

    @Override
    public ResponseEntity<CompetitionResponseVO> getCompetitionById(String id) {
        log.warn("[Fallback] competition-service unavailable — getCompetitionById id={}", id);
        return ResponseEntity.ok(null);
    }

    @Override
    public ResponseEntity<List<CompetitionResponseVO>> getCompetitionsByIds(List<String> ids) {
        log.warn("[Fallback] competition-service unavailable — getCompetitionsByIds returning empty list");
        return ResponseEntity.ok(Collections.emptyList());
    }
}
