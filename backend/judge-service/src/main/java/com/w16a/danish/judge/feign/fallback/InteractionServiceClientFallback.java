package com.w16a.danish.judge.feign.fallback;

import com.w16a.danish.judge.domain.vo.InteractionStatisticsVO;
import com.w16a.danish.judge.feign.InteractionServiceClient;
import com.w16a.danish.common.exception.ServiceUnavailableException;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class InteractionServiceClientFallback implements InteractionServiceClient {

    @Override
    public ResponseEntity<InteractionStatisticsVO> getInteractionStatistics(String competitionId) {
        throw new ServiceUnavailableException("interaction-service", "getInteractionStatistics");
    }

    @Override
    public ResponseEntity<InteractionStatisticsVO> getPlatformInteractionStatistics() {
        throw new ServiceUnavailableException("interaction-service", "getPlatformInteractionStatistics");
    }
}
