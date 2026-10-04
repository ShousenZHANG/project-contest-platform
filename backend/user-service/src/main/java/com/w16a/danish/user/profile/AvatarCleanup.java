package com.w16a.danish.user.profile;

import com.w16a.danish.common.recovery.DurableTask;
import com.w16a.danish.common.recovery.DurableTaskHandler;
import com.w16a.danish.user.feign.FileServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Delivery may repeat; the file service treats a missing managed avatar as success. */
@Component
@RequiredArgsConstructor
public class AvatarCleanup implements DurableTaskHandler {
    private final FileServiceClient files;
    @Override public String kind() { return AvatarFiles.DELETE; }
    @Override public void execute(DurableTask task) {
        String key = task.payload().path("objectName").asText();
        if (!key.matches("[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9]{1,10})?")) {
            throw new IllegalArgumentException("Invalid avatar object key");
        }
        var result = files.deleteFile("user-avatar", key);
        if (result == null || !result.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Avatar deletion failed");
        }
    }
}
