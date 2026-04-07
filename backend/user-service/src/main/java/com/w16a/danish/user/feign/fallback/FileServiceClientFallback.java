package com.w16a.danish.user.feign.fallback;

import com.w16a.danish.user.feign.FileServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Component
public class FileServiceClientFallback implements FileServiceClient {

    @Override
    public ResponseEntity<String> uploadAvatar(MultipartFile file) {
        log.error("[Fallback] file-service unavailable — uploadAvatar failed");
        return ResponseEntity.internalServerError().body("File service unavailable");
    }

    @Override
    public ResponseEntity<String> deleteFile(String bucket, String objectName) {
        log.error("[Fallback] file-service unavailable — deleteFile failed: bucket={}, object={}", bucket, objectName);
        return ResponseEntity.internalServerError().body("File service unavailable");
    }
}
