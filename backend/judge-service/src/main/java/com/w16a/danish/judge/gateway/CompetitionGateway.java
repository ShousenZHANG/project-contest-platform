package com.w16a.danish.judge.gateway;

import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.judge.feign.CompetitionServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.List;
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
     * Several competitions in one call. Missing ids are absent from the result rather than an error;
     * batch reads are used to decorate lists, where one dead id should not fail the page.
     */
    public List<CompetitionResponseVO> findAll(List<String> competitionIds) {
        if (competitionIds == null || competitionIds.isEmpty()) {
            return List.of();
        }
        return Optional.ofNullable(competitionServiceClient.getCompetitionsByIds(competitionIds))
                .map(response -> response.getBody())
                .orElse(List.of());
    }

    /** Every competition on the platform. Empty rather than null when the read fails. */
    public List<CompetitionResponseVO> listAll() {
        return Optional.ofNullable(competitionServiceClient.listAllCompetitions())
                .map(response -> response.getBody())
                .orElse(List.of());
    }

    /**
     * Whether this user organises this competition.
     *
     * <p>A null answer is treated as "no". Callers were each writing
     * {@code Boolean.TRUE.equals(...getBody())} to reach the same conclusion.
     */
    public boolean isOrganiser(String competitionId, String userId) {
        return Optional.ofNullable(competitionServiceClient.isUserOrganizer(competitionId, userId))
                .map(response -> response.getBody())
                .map(Boolean.TRUE::equals)
                .orElse(false);
    }

    /** Moves a competition to a new lifecycle status. */
    public void updateStatus(String competitionId, String status) {
        competitionServiceClient.updateCompetitionStatus(competitionId, status);
    }
}
