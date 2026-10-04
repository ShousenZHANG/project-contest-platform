package com.w16a.danish.registration.gateway;

import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.common.exception.ServiceUnavailableException;
import com.w16a.danish.registration.feign.CompetitionServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.ArrayList;
import java.util.Optional;

/**
 * Reads competitions from the competition service.
 *
 * <p>This exists so that "what does a missing competition mean" is decided once. Before it, every
 * caller unwrapped the {@code ResponseEntity} itself, invented its own null check, and picked its
 * own status and wording — which had already drifted into two spellings of the same message inside
 * a single file.
 *
 * <p>Callers should not see Feign, {@code ResponseEntity} or HTTP status codes. If a method here
 * starts leaking one of those, the policy belongs in this class instead.
 */
@Component
@RequiredArgsConstructor
public class CompetitionGateway {

    private final CompetitionServiceClient competitionServiceClient;

    /**
     * The competition, or a 404 for the whole request.
     *
     * @param competitionId competition to load
     * @return the competition, never null
     * @throws BusinessException 404 if the competition service has no such competition
     */
    public CompetitionResponseVO require(String competitionId) {
        return find(competitionId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Competition not found"));
    }

    /**
     * The competition if it exists.
     *
     * <p>Use this only where a missing competition is a normal outcome the caller handles. Where it
     * means the request cannot proceed, use {@link #require(String)} so the failure is uniform.
     */
    public Optional<CompetitionResponseVO> find(String competitionId) {
        if (competitionId == null || competitionId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(competitionServiceClient.getCompetitionById(competitionId))
                .map(response -> response.getBody());
    }

    /**
     * Several competitions in batches of at most 100. Missing ids are absent from the result;
     * batch reads are used to decorate lists, where one dead id should not fail the page.
     */
    public List<CompetitionResponseVO> findAll(List<String> competitionIds) {
        if (competitionIds == null || competitionIds.isEmpty()) {
            return List.of();
        }
        List<CompetitionResponseVO> competitions = new ArrayList<>();
        for (int start = 0; start < competitionIds.size(); start += 100) {
            var response = competitionServiceClient.getCompetitionsByIds(
                    competitionIds.subList(start, Math.min(start + 100, competitionIds.size())));
            if (response == null || !response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new ServiceUnavailableException("competition-service", "getCompetitionsByIds");
            }
            competitions.addAll(response.getBody());
        }
        return competitions;
    }

    public boolean isAssignedJudge(String competitionId, String userId) {
        var response = competitionServiceClient.isUserJudge(competitionId, userId);
        if (response == null || !response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new ServiceUnavailableException("competition-service", "isUserJudge");
        }
        return response.getBody();
    }
}
