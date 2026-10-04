package com.w16a.danish.registration.feign;

import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

/**
 * Feign client for communicating with competition-service.
 * Used to fetch competition details from registration-service.
 *
 * @author Eddy ZHANG
 * @date 2025/04/03
 */
@FeignClient(name = "competition-service", path = "/competitions", configuration = com.w16a.danish.common.security.InternalFeignConfiguration.class, fallback = com.w16a.danish.registration.feign.fallback.CompetitionServiceClientFallback.class)
public interface CompetitionServiceClient {

    /**
     * Get competition details by ID.
     *
     * @param id competition ID
     * @return competition detail response
     */
    @GetMapping("/internal/{id}")
    ResponseEntity<CompetitionResponseVO> getCompetitionById(@PathVariable("id") String id);

    /**
     *
     * Get competition details by a list of IDs.
     *
     * @param ids list of competition IDs
     * @return {@link ResponseEntity }<{@link List }<{@link CompetitionResponseVO }>>
     */
    @PostMapping("/internal/batch/ids")
    ResponseEntity<List<CompetitionResponseVO>> getCompetitionsByIds(@RequestBody List<String> ids);

    @GetMapping("/internal/is-judge")
    ResponseEntity<Boolean> isUserJudge(@org.springframework.web.bind.annotation.RequestParam("competitionId") String competitionId,
                                        @org.springframework.web.bind.annotation.RequestParam("userId") String userId);
}
