package com.w16a.danish.judge.feign.fallback;

import com.w16a.danish.judge.domain.vo.InteractionStatisticsVO;
import com.w16a.danish.judge.feign.InteractionServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class InteractionServiceClientFallback implements InteractionServiceClient {

    @Override
    public ResponseEntity<InteractionStatisticsVO> getInteractionStatistics(String submissionId) {
        log.warn("[Fallback] interaction-service unavailable — getInteractionStatistics submissionId={}", submissionId);
        return ResponseEntity.ok(new InteractionStatisticsVO());
    }

    @Override
    public ResponseEntity<InteractionStatisticsVO> getPlatformInteractionStatistics() {
        log.warn("[Fallback] interaction-service unavailable — getPlatformInteractionStatistics");
        return ResponseEntity.ok(new InteractionStatisticsVO());
    }
}
