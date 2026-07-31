package com.w16a.danish.judge.feign.fallback;

import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.common.exception.ServiceUnavailableException;
import com.w16a.danish.judge.gateway.CompetitionGateway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * A circuit-breaker fallback answers when the upstream service is down. What it returns decides
 * what the user is told.
 *
 * <p>These fallbacks used to return an empty body, which {@link CompetitionGateway#require} then
 * reported as 404 "Competition not found" — telling someone their competition had been deleted
 * when the truth was that competition-service was unreachable. registration-service's equivalent
 * fallback already threw; this pins judge-service to the same rule.
 */
class CompetitionServiceClientFallbackTest {

    private final CompetitionServiceClientFallback fallback = new CompetitionServiceClientFallback();

    @Test
    @DisplayName("A single-entity read reports the outage as 503, not as a missing competition")
    void singleReadReportsOutage() {
        assertThatThrownBy(() -> fallback.getCompetitionById("c1"))
                .isInstanceOf(ServiceUnavailableException.class)
                .asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.type(BusinessException.class))
                .extracting(BusinessException::getStatus)
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    @DisplayName("The outage message names the service and the operation")
    void outageMessageIsActionable() {
        assertThatThrownBy(() -> fallback.getCompetitionById("c1"))
                .hasMessageContaining("competition-service")
                .hasMessageContaining("getCompetitionById");
    }

    @Test
    @DisplayName("A status update reports the outage rather than pretending it succeeded")
    void statusUpdateReportsOutage() {
        assertThatThrownBy(() -> fallback.updateCompetitionStatus("c1", "AWARDED"))
                .isInstanceOf(ServiceUnavailableException.class);
    }

    @Test
    @DisplayName("Batch reads still degrade to empty, because one dead id must not fail a page")
    void batchReadsDegradeQuietly() {
        assertThat(fallback.getCompetitionsByIds(List.of("c1")).getBody()).isEmpty();
        assertThat(fallback.listAllCompetitions().getBody()).isEmpty();
    }

    @Test
    @DisplayName("An authorisation check degrades to 'no', which is the safe answer")
    void organiserCheckDegradesToFalse() {
        assertThat(fallback.isUserOrganizer("c1", "u1").getBody()).isFalse();
    }
}
