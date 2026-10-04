package com.w16a.danish.fileService.service.impl;

import cn.hutool.core.lang.UUID;
import com.w16a.danish.fileService.config.MinioPropertiesConfig;
import com.w16a.danish.fileService.enums.BucketType;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.fileService.service.FileStorageService;
import com.w16a.danish.fileService.util.FileValidator;
import io.minio.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.InputStreamResource;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;


/**
 * Implementation of the FileStorageService interface for interacting with MinIO object storage.
 * Provides functionality to upload files to different buckets (avatars, promos, submissions),
 * generate temporary access URLs, and delete files.
 *
 * @author Eddy ZHANG
 * @date 2025/03/28
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileStorageServiceImpl implements FileStorageService {

    private final MinioClient minioClient;
    private final MinioPropertiesConfig minioPropertiesConfig;

    @PostConstruct
    public void reconcileSubmissionPrivacy() {
        try {
            // Also remove a historical public policy from an already-existing bucket.
            ensureBucketExists(BucketType.SUBMISSIONS);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot secure submissions bucket", ex);
        }
    }

    @Override
    public InputStreamResource readSubmission(String objectName) {
        if (objectName == null || !objectName.matches("[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9]{1,10})?")) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid submission object name");
        }
        try {
            ensureBucketExists(BucketType.SUBMISSIONS);
            return new InputStreamResource(minioClient.getObject(GetObjectArgs.builder()
                    .bucket(BucketType.SUBMISSIONS.getBucketName()).object(objectName).build()));
        } catch (io.minio.errors.ErrorResponseException ex) {
            if ("NoSuchKey".equals(ex.errorResponse().code())) {
                throw new BusinessException(HttpStatus.NOT_FOUND, "Submission file not found");
            }
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Submission storage unavailable");
        } catch (Exception ex) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Submission storage unavailable");
        }
    }

    /**
     * Uploads user avatar image to the public avatar bucket.
     */
    @Override
    public String uploadAvatar(MultipartFile file) {
        FileValidator.validateImage(file);
        return upload(BucketType.USER_AVATAR, file);
    }

    /**
     * Uploads competition promo assets (videos/images) to the public promo bucket.
     */
    @Override
    public String uploadCompetitionPromo(MultipartFile file) {
        FileValidator.validateBasic(file);
        return upload(BucketType.COMPETITION_ASSETS, file);
    }


    /**
     * Uploads a participant's submission to the private submission bucket.
     */
    @Override
    public String uploadSubmission(MultipartFile file) {
        FileValidator.validateBasic(file);
        return upload(BucketType.SUBMISSIONS, file);
    }

    /**
     * Common logic for uploading a file to a given bucket type.
     * Retains the raw storage URL contract for existing Feign consumers.
     */
    private String upload(BucketType bucketType, MultipartFile file) {
        try {
            ensureBucketExists(bucketType);
            String objectName = UUID.randomUUID() + safeExtension(file.getOriginalFilename());
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketType.getBucketName())
                            .object(objectName)
                            .stream(file.getInputStream(), file.getSize(), -1L)
                            .contentType(file.getContentType())
                            .build()
            );

            String publicEndpoint = minioPropertiesConfig.getPublicEndpoint();
            if (publicEndpoint.endsWith("/")) {
                publicEndpoint = publicEndpoint.substring(0, publicEndpoint.length() - 1);
            }

            return publicEndpoint + "/" + bucketType.getBucketName() + "/" + objectName;
        } catch (Exception e) {
            log.error("File upload failed for bucket={}", bucketType, e);
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "File upload failed");
        }
    }

    /**
     * Derives a safe object-name suffix from the client-supplied filename. Only a short
     * alphanumeric extension is preserved, so path separators or traversal sequences
     * ("../") in the original name can never reach the object store key.
     */
    private String safeExtension(String originalFilename) {
        if (originalFilename == null) {
            return "";
        }
        int dot = originalFilename.lastIndexOf('.');
        if (dot < 0 || dot == originalFilename.length() - 1) {
            return "";
        }
        String ext = originalFilename.substring(dot + 1);
        return ext.matches("[A-Za-z0-9]{1,10}") ? "." + ext.toLowerCase() : "";
    }

    /**
     * Ensures the bucket exists; creates it if not found.
     * Submission objects remain private; public buckets retain their read policy.
     */
    private void ensureBucketExists(BucketType bucketType) throws Exception {
        String bucketName = bucketType.getBucketName();
        boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!found) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
        }
        if (!bucketType.isPublicRead()) {
            minioClient.deleteBucketPolicy(DeleteBucketPolicyArgs.builder().bucket(bucketName).build());
        } else if (!found) {
            // Define public read policy for the bucket
            String policy = "{\n" +
                    "  \"Version\": \"2012-10-17\",\n" +
                    "  \"Statement\": [\n" +
                    "    {\n" +
                    "      \"Sid\": \"PublicRead\",\n" +
                    "      \"Effect\": \"Allow\",\n" +
                    "      \"Principal\": \"*\",\n" +
                    "      \"Action\": [\n" +
                    "        \"s3:GetObject\"\n" +
                    "      ],\n" +
                    "      \"Resource\": [\n" +
                    "        \"arn:aws:s3:::" + bucketName + "/*\"\n" +
                    "      ]\n" +
                    "    }\n" +
                    "  ]\n" +
                    "}";

            // Apply bucket policy
            minioClient.setBucketPolicy(SetBucketPolicyArgs.builder()
                    .bucket(bucketName)
                    .config(policy)
                    .build());
        }
    }

    /**
     * Deletes a file from the specified bucket if it exists.
     */
    @Override
    public void deleteFile(String bucketName, String objectName) {
        try {
            // Check if the object exists in the bucket
            minioClient.statObject(StatObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .build());

            // Remove the object from the bucket
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .build());

        } catch (io.minio.errors.ErrorResponseException missing) {
            if ("NoSuchKey".equals(missing.errorResponse().code()) || "NoSuchObject".equals(missing.errorResponse().code())) return;
            log.error("File deletion failed for bucket={} object={}: {}", bucketName, objectName, missing.errorResponse().code());
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "File deletion failed");
        } catch (Exception e) {
            log.error("File deletion failed for bucket={} object={}: {}", bucketName, objectName, e.getClass().getSimpleName());
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "File deletion failed");
        }
    }

}
