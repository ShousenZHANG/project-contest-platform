package com.w16a.danish.registration.notify;

import com.w16a.danish.common.recovery.DurableTask;
import com.w16a.danish.common.recovery.DurableTaskHandler;
import com.w16a.danish.registration.feign.FileServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SubmissionFileCleanup implements DurableTaskHandler {
    private final FileServiceClient files;
    @Override public String kind() { return "SUBMISSION_FILE_DELETE"; }
    @Override public void execute(DurableTask task) {
        var result = files.deleteFile("submissions", task.payload().path("objectName").asText());
        if (result == null || !result.getStatusCode().is2xxSuccessful()) throw new IllegalStateException("File deletion failed");
    }
}
