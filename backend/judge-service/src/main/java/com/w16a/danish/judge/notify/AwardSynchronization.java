package com.w16a.danish.judge.notify;

import com.w16a.danish.common.recovery.DurableTask;
import com.w16a.danish.common.recovery.DurableTaskHandler;
import com.w16a.danish.judge.feign.CompetitionServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AwardSynchronization implements DurableTaskHandler {
    private final CompetitionServiceClient competitions;
    @Override public String kind() { return "COMPETITION_AWARDED"; }
    @Override public void execute(DurableTask task) {
        var result = competitions.updateCompetitionStatus(task.aggregateId(), "AWARDED");
        if (result == null || !result.getStatusCode().is2xxSuccessful()) throw new IllegalStateException("Award synchronization failed");
    }
}
