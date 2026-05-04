package com.w16a.danish.registration.feign.fallback;

import com.w16a.danish.common.exception.ServiceUnavailableException;
import com.w16a.danish.registration.feign.FileServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Component
public class FileServiceClientFallback implements FileServiceClient {

    @Override
    public ResponseEntity<String> uploadSubmission(MultipartFile file) {
        throw new ServiceUnavailableException("file-service", "uploadSubmission");
    }

    @Override
    public ResponseEntity<String> deleteFile(String bucket, String objectName) {
        throw new ServiceUnavailableException("file-service", "deleteFile");
    }
}
