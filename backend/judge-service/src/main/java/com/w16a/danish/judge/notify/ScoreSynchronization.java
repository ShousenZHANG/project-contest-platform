package com.w16a.danish.judge.notify;

import com.w16a.danish.common.recovery.DurableTask;
import com.w16a.danish.common.recovery.DurableTaskHandler;
import com.w16a.danish.judge.feign.SubmissionServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
public class ScoreSynchronization implements DurableTaskHandler {
    private final SubmissionServiceClient submissions;
    @Override public String kind() { return "SUBMISSION_SCORE"; }
    @Override public void execute(DurableTask task) {
        var payload = task.payload();
        if (task.aggregateId() == null || task.aggregateId().isBlank() || task.version() == null || task.version() < 1
                || payload == null || !payload.path("revision").isIntegralNumber()
                || !payload.path("revision").canConvertToInt() || payload.path("revision").intValue() < 0
                || !payload.path("score").isNumber()) {
            throw new IllegalArgumentException("Score task has invalid identity, version, revision or score");
        }
        BigDecimal score = payload.path("score").decimalValue();
        if (score.compareTo(BigDecimal.ZERO) < 0 || score.compareTo(BigDecimal.TEN) > 0 || score.scale() > 2) {
            throw new IllegalArgumentException("Score task must use the current 0-10 schema with two decimal places");
        }
        var result = submissions.updateTotalScore(task.aggregateId(), score, task.version(), payload.path("revision").intValue());
        if (result == null || !result.getStatusCode().is2xxSuccessful()) throw new IllegalStateException("Score synchronization failed");
    }
}
