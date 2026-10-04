package com.w16a.danish.fileService.controller;

import com.w16a.danish.fileService.service.FileStorageService;
import com.w16a.danish.common.security.ServiceOnly;
import com.w16a.danish.common.security.ServiceAuthorizationInterceptor;
import com.w16a.danish.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ContentDisposition;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import lombok.extern.slf4j.Slf4j;

/**
 *
 * File Upload Controller
 *
 * @author Eddy ZHANG
 * @date 2025/03/27
 */
@Slf4j
@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileStorageService fileStorageService;

    @PostMapping(value = "/upload/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ServiceOnly(value = "files:avatar:upload", callers = "user-service")
    public ResponseEntity<String> uploadAvatar(@RequestPart("file") MultipartFile file) {
        String uploadedUrl = fileStorageService.uploadAvatar(file);
        return ResponseEntity.ok(uploadedUrl);
    }

    @PostMapping(value = "/upload/promo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ServiceOnly(value = "files:promo:upload", callers = "competition-service")
    public ResponseEntity<String> uploadCompetitionPromo(@RequestPart("file") MultipartFile file) {
        String uploadedUrl = fileStorageService.uploadCompetitionPromo(file);
        return ResponseEntity.ok(uploadedUrl);
    }

    @PostMapping(value = "/upload/submission", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ServiceOnly(value = "files:submission:upload", callers = "registration-service")
    public ResponseEntity<String> uploadSubmission(@RequestPart("file") MultipartFile file) {
        String objectName = fileStorageService.uploadSubmission(file);
        return ResponseEntity.ok(objectName);
    }

    @DeleteMapping("/delete")
    @ServiceOnly(value = "files:delete", callers = {"user-service", "competition-service", "registration-service"})
    public ResponseEntity<String> deleteFile(@RequestParam("bucket") String bucket,
                                             @RequestParam("objectName") String objectName,
                                             HttpServletRequest request) {
        String caller = (String) request.getAttribute(ServiceAuthorizationInterceptor.CALLER_ATTRIBUTE);
        String allowedBucket = switch (caller == null ? "" : caller) {
            case "user-service" -> "user-avatar";
            case "competition-service" -> "competition-assets";
            case "registration-service" -> "submissions";
            default -> "";
        };
        if (!bucket.equals(allowedBucket)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Service cannot delete from this bucket");
        }
        fileStorageService.deleteFile(bucket, objectName);
        return ResponseEntity.ok("File deleted successfully.");
    }

    @GetMapping("/internal/submission")
    @ServiceOnly(value = "files:submission:read", callers = "registration-service")
    public ResponseEntity<InputStreamResource> readSubmission(@RequestParam("objectName") String objectName) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(objectName).build().toString())
                .body(fileStorageService.readSubmission(objectName));
    }

}
