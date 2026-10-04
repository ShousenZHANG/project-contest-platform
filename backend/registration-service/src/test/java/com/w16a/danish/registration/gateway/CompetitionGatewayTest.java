package com.w16a.danish.registration.gateway;

import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.feign.CompetitionServiceClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * The gateway is where "what does a missing competition mean" is decided, so these are the tests
 * that used to be impossible to write: reaching the same branches through a caller meant stubbing
 * a Feign client, a ResponseEntity and a body at once.
 */
class CompetitionGatewayTest {

    private CompetitionServiceClient client;
    private CompetitionGateway gateway;

    @BeforeEach
    void setUp() {
        client = mock(CompetitionServiceClient.class);
        gateway = new CompetitionGateway(client);
    }

    @Test
    @DisplayName("require returns the competition when the remote service has it")
    void requireReturnsCompetition() {
        CompetitionResponseVO competition = new CompetitionResponseVO();
        when(client.getCompetitionById("c1")).thenReturn(ResponseEntity.ok(competition));

        assertThat(gateway.require("c1")).isSameAs(competition);
    }

    @Test
    @DisplayName("require turns an empty body into a 404 for the whole request")
    void requireThrowsOnEmptyBody() {
        when(client.getCompetitionById("gone")).thenReturn(ResponseEntity.ok(null));

        assertThatThrownBy(() -> gateway.require("gone"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Competition not found");
    }

    @Test
    @DisplayName("require treats a null response the same as a missing competition")
    void requireThrowsOnNullResponse() {
        when(client.getCompetitionById("gone")).thenReturn(null);

        assertThatThrownBy(() -> gateway.require("gone"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("find reports absence without calling the remote service for a blank id")
    void findShortCircuitsBlankId() {
        assertThat(gateway.find(null)).isEmpty();
        assertThat(gateway.find("  ")).isEmpty();

        verifyNoInteractions(client);
    }

    @Test
    @DisplayName("find returns the competition when it exists")
    void findReturnsCompetition() {
        CompetitionResponseVO competition = new CompetitionResponseVO();
        when(client.getCompetitionById("c1")).thenReturn(ResponseEntity.ok(competition));

        Optional<CompetitionResponseVO> found = gateway.find("c1");

        assertThat(found).containsSame(competition);
    }

    @Test
    @DisplayName("findAll skips the remote call for an empty id list")
    void findAllShortCircuitsEmptyInput() {
        assertThat(gateway.findAll(null)).isEmpty();
        assertThat(gateway.findAll(List.of())).isEmpty();

        verifyNoInteractions(client);
    }

    @Test
    @DisplayName("findAll fails closed when the dependency supplies no response body")
    void findAllRejectsNullBody() {
        when(client.getCompetitionsByIds(anyList())).thenReturn(ResponseEntity.ok(null));

        assertThatThrownBy(() -> gateway.findAll(List.of("c1")))
                .isInstanceOf(com.w16a.danish.common.exception.ServiceUnavailableException.class);
    }

    @Test
    @DisplayName("findAll passes the ids through and returns what came back")
    void findAllReturnsBatch() {
        List<CompetitionResponseVO> batch = List.of(new CompetitionResponseVO());
        when(client.getCompetitionsByIds(List.of("c1"))).thenReturn(ResponseEntity.ok(batch));

        assertThat(gateway.findAll(List.of("c1"))).isEqualTo(batch);
    }

    @Test
    void findAllBatchesEveryIdWithinTheInternalLimit() {
        List<String> ids = java.util.stream.IntStream.range(0, 205).mapToObj(i -> "c" + i).toList();
        when(client.getCompetitionsByIds(anyList())).thenAnswer(invocation -> {
            List<String> batch = invocation.getArgument(0);
            assertThat(batch).hasSizeLessThanOrEqualTo(100);
            return ResponseEntity.ok(batch.stream().map(id -> {
                var competition = new CompetitionResponseVO();
                competition.setId(id);
                return competition;
            }).toList());
        });
        assertThat(gateway.findAll(ids)).extracting(CompetitionResponseVO::getId).containsExactlyElementsOf(ids);
        org.mockito.Mockito.verify(client, org.mockito.Mockito.times(3)).getCompetitionsByIds(anyList());
    }

    @Test
    void failedBatchDoesNotBecomeASuccessfulEmptyPage() {
        when(client.getCompetitionsByIds(anyList())).thenReturn(null);
        assertThatThrownBy(() -> gateway.findAll(List.of("c1")))
                .isInstanceOf(com.w16a.danish.common.exception.ServiceUnavailableException.class);
        when(client.getCompetitionsByIds(anyList())).thenReturn(ResponseEntity.status(503).body(List.of()));
        assertThatThrownBy(() -> gateway.findAll(List.of("c1")))
                .isInstanceOf(com.w16a.danish.common.exception.ServiceUnavailableException.class);
    }

    @Test
    void judgePredicateRequiresAnExplicitSuccessfulBoolean() {
        when(client.isUserJudge("c1", "judge")).thenReturn(ResponseEntity.ok(true));
        assertThat(gateway.isAssignedJudge("c1", "judge")).isTrue();
        when(client.isUserJudge("c1", "judge")).thenReturn(ResponseEntity.ok(false));
        assertThat(gateway.isAssignedJudge("c1", "judge")).isFalse();
        when(client.isUserJudge("c1", "judge")).thenReturn(ResponseEntity.ok(null));
        assertThatThrownBy(() -> gateway.isAssignedJudge("c1", "judge"))
                .isInstanceOf(com.w16a.danish.common.exception.ServiceUnavailableException.class);
    }




}
