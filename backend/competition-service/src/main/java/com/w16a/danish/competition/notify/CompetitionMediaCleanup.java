package com.w16a.danish.competition.notify;

import com.w16a.danish.common.recovery.DurableTask;
import com.w16a.danish.common.recovery.DurableTaskHandler;
import com.w16a.danish.competition.feign.FileServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CompetitionMediaCleanup implements DurableTaskHandler {
    private final FileServiceClient files;
    @Override public String kind() { return CompetitionMediaFiles.DELETE; }
    @Override public void execute(DurableTask task) {
        String key = task.payload().path("objectName").asText();
        if (!key.matches("[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9]{1,10})?")) throw new IllegalArgumentException("Invalid asset key");
        var result = files.deleteFile("competition-assets", key);
        if (result == null || !result.getStatusCode().is2xxSuccessful()) throw new IllegalStateException("Asset deletion failed");
    }
}
