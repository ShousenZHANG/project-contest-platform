package com.w16a.danish.judge.feign;

import com.w16a.danish.judge.domain.vo.InteractionStatisticsVO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Feign client for calling Interaction Service to fetch interaction statistics (votes and comments).
 *
 * @author Eddy
 * @date 2025/04/21
 */
@FeignClient(name = "interaction-service", configuration = com.w16a.danish.common.security.InternalFeignConfiguration.class, fallback = com.w16a.danish.judge.feign.fallback.InteractionServiceClientFallback.class)
public interface InteractionServiceClient {

    /**
     * Get vote and comment totals for a specific competition.
     *
     * @param competitionId ID of the competition
     * @return InteractionStatisticsVO containing vote count and comment count
     */
    @GetMapping("/interactions/internal/competition-statistics")
    ResponseEntity<InteractionStatisticsVO> getInteractionStatistics(
            @RequestParam("competitionId") String competitionId
    );

    /**
     * Get platform-wide interaction statistics (total votes and comments).
     *
     * @return InteractionStatisticsVO containing total vote count and total comment count
     */
    @GetMapping("/interactions/public/platform/interaction-statistics")
    ResponseEntity<InteractionStatisticsVO> getPlatformInteractionStatistics();
}
