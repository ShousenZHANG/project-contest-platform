package com.w16a.danish.judge.notify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.w16a.danish.common.recovery.DurableTask;
import com.w16a.danish.judge.feign.SubmissionServiceClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ScoreSynchronizationTest {
    private final SubmissionServiceClient submissions = mock(SubmissionServiceClient.class);
    private final ScoreSynchronization handler = new ScoreSynchronization(submissions);
    private final ObjectMapper json = new ObjectMapper();

    @Test void validCommandCarriesCurrentFileRevisionAndMonotonicVersion() throws Exception {
        when(submissions.updateTotalScore("s", new BigDecimal("8.25"), 7L, 3)).thenReturn(ResponseEntity.ok().build());
        handler.execute(task("{\"score\":8.25,\"revision\":3}", 7L));
        verify(submissions).updateTotalScore("s", new BigDecimal("8.25"), 7L, 3);
    }

    @Test void missingCoercedOrOutOfSchemaDataNeverWritesAnAccidentalZeroProjection() throws Exception {
        for (String invalid : new String[]{"{\"revision\":0}", "{\"score\":8}",
                "{\"score\":\"8\",\"revision\":0}", "{\"score\":8,\"revision\":\"0\"}",
                "{\"score\":8,\"revision\":0.5}", "{\"score\":8,\"revision\":2147483648}",
                "{\"score\":8,\"revision\":-1}", "{\"score\":92.5,\"revision\":0}",
                "{\"score\":8.333,\"revision\":0}"}) {
            var task = task(invalid, 1L);
            assertThatThrownBy(() -> handler.execute(task)).isInstanceOf(IllegalArgumentException.class);
        }
        for (Long version : new Long[]{null, 0L, -1L}) {
            var task = task("{\"score\":8,\"revision\":0}", version);
            assertThatThrownBy(() -> handler.execute(task)).isInstanceOf(IllegalArgumentException.class);
        }
        verifyNoInteractions(submissions);
    }

    @Test void rejectedDeliveryRemainsAFailedTaskForDurableRetry() throws Exception {
        when(submissions.updateTotalScore(anyString(), any(), anyLong(), anyInt())).thenReturn(ResponseEntity.status(503).build());
        var task = task("{\"score\":8,\"revision\":0}", 1L);
        assertThatThrownBy(() -> handler.execute(task)).isInstanceOf(IllegalStateException.class);
    }

    private DurableTask task(String payload, Long version) throws Exception {
        return new DurableTask("event", "SUBMISSION_SCORE", "s", version, json.readTree(payload));
    }
}
