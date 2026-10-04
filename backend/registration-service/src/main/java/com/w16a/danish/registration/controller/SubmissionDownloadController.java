package com.w16a.danish.registration.controller;

import com.w16a.danish.common.context.CurrentUser;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.service.SubmissionDownloads;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/submissions")
@RequiredArgsConstructor
public class SubmissionDownloadController {
    private final SubmissionDownloads downloads;

    @GetMapping("/public/{id}/download")
    public ResponseEntity<StreamingResponseBody> downloadPublic(@PathVariable String id) {
        return download(id, null);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<StreamingResponseBody> downloadPrivate(@PathVariable String id, @CurrentUser RequestContext user) {
        return download(id, user);
    }

    private ResponseEntity<StreamingResponseBody> download(String id, RequestContext user) {
        var submission = downloads.requireAccessible(id, user);
        var upstream = downloads.open(submission);
        if (upstream.status() != 200 || upstream.body() == null) {
            upstream.close();
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Submission file is unavailable");
        }
        StreamingResponseBody stream = output -> {
            try (upstream; var input = upstream.body().asInputStream()) { input.transferTo(output); }
        };
        String filename = submission.getFileName() == null ? "submission" : submission.getFileName().replaceAll("[\\r\\n\\\\/]", "_");
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff").body(stream);
    }
}
