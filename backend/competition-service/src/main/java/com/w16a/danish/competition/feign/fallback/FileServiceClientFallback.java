package com.w16a.danish.competition.feign.fallback;

import com.w16a.danish.common.exception.ServiceUnavailableException;
import com.w16a.danish.competition.feign.FileServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Component
public class FileServiceClientFallback implements FileServiceClient {

    @Override
    public ResponseEntity<String> uploadCompetitionPromo(MultipartFile file) {
        log.error("[Fallback] file-service unavailable — uploadCompetitionPromo failed");
        throw new ServiceUnavailableException("file-service", "uploadCompetitionPromo");
    }

    @Override
    public ResponseEntity<String> deleteFile(String bucket, String objectName) {
        log.error("[Fallback] file-service unavailable — deleteFile failed: bucket={}, object={}", bucket, objectName);
        throw new ServiceUnavailableException("file-service", "deleteFile");
    }
}
