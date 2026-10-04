package com.w16a.danish.fileService.service.impl;

import com.w16a.danish.fileService.config.MinioPropertiesConfig;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.fileService.util.FileValidator;
import io.minio.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;


import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class FileStorageServiceImplTest {

    private MinioClient minioClient;
    private MinioPropertiesConfig minioPropertiesConfig;
    private FileStorageServiceImpl fileStorageService;

    @BeforeEach
    void setUp() {
        minioClient = mock(MinioClient.class);
        minioPropertiesConfig = mock(MinioPropertiesConfig.class);
        fileStorageService = new FileStorageServiceImpl(minioClient, minioPropertiesConfig);
    }

    @Test
    @DisplayName("✅ Should upload avatar successfully")
    void testUploadAvatar_Success() throws Exception {
        try (MockedStatic<FileValidator> mocked = Mockito.mockStatic(FileValidator.class)) {
            mocked.when(() -> FileValidator.validateImage(any())).thenAnswer(invocation -> null);

            MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", "test".getBytes());

            when(minioClient.bucketExists(any(BucketExistsArgs.class))).thenReturn(true);
            when(minioPropertiesConfig.getPublicEndpoint()).thenReturn("http://localhost:9000");

            String url = fileStorageService.uploadAvatar(file);

            assertThat(url).contains("http://localhost:9000/user-avatar/");
        }
    }

    @Test
    @DisplayName("✅ Should upload competition promo successfully")
    void testUploadCompetitionPromo_Success() throws Exception {
        try (MockedStatic<FileValidator> mocked = Mockito.mockStatic(FileValidator.class)) {
            mocked.when(() -> FileValidator.validateBasic(any())).thenAnswer(invocation -> null);

            MockMultipartFile file = new MockMultipartFile("file", "promo.mp4", "video/mp4", "test".getBytes());

            when(minioClient.bucketExists(any(BucketExistsArgs.class))).thenReturn(true);
            when(minioPropertiesConfig.getPublicEndpoint()).thenReturn("http://localhost:9000");

            String url = fileStorageService.uploadCompetitionPromo(file);

            assertThat(url).contains("http://localhost:9000/competition-assets/");
        }
    }

    @Test
    @DisplayName("✅ Should upload submission successfully")
    void testUploadSubmission_Success() throws Exception {
        try (MockedStatic<FileValidator> mocked = Mockito.mockStatic(FileValidator.class)) {
            mocked.when(() -> FileValidator.validateBasic(any())).thenAnswer(invocation -> null);

            MockMultipartFile file = new MockMultipartFile("file", "submission.zip", "application/zip", "test".getBytes());

            when(minioClient.bucketExists(any(BucketExistsArgs.class))).thenReturn(true);
            when(minioPropertiesConfig.getPublicEndpoint()).thenReturn("http://localhost:9000");

            String url = fileStorageService.uploadSubmission(file);

            assertThat(url).contains("http://localhost:9000/submissions/");
        }
    }

    @Test
    @DisplayName("❌ Should throw BusinessException when upload fails")
    void testUpload_Failure() throws Exception {
        try (MockedStatic<FileValidator> mocked = Mockito.mockStatic(FileValidator.class)) {
            mocked.when(() -> FileValidator.validateBasic(any())).thenAnswer(invocation -> null);

            MockMultipartFile file = new MockMultipartFile("file", "fail.txt", "text/plain", "test".getBytes());

            when(minioClient.bucketExists(any(BucketExistsArgs.class))).thenThrow(new RuntimeException("MinIO Error"));

            assertThatThrownBy(() -> fileStorageService.uploadCompetitionPromo(file))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("File upload failed");
        }
    }

    @Test
    @DisplayName("✅ Should delete file successfully")
    void testDeleteFile_Success() throws Exception {
        when(minioClient.statObject(any(StatObjectArgs.class))).thenReturn(mock(StatObjectResponse.class));
        doNothing().when(minioClient).removeObject(any(RemoveObjectArgs.class));

        fileStorageService.deleteFile("bucket", "objectName");
    }

    @Test
    @DisplayName("❌ Should throw BusinessException when deletion fails")
    void testDeleteFile_Failure() throws Exception {
        when(minioClient.statObject(any(StatObjectArgs.class))).thenThrow(new RuntimeException("Delete Error"));

        assertThatThrownBy(() -> fileStorageService.deleteFile("bucket", "objectName"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("File deletion failed");
    }

    @Test
    void startupRemovesHistoricalPublicPolicyFromExistingSubmissionsBucket() throws Exception {
        when(minioClient.bucketExists(any())).thenReturn(true);
        fileStorageService.reconcileSubmissionPrivacy();
        ArgumentCaptor<DeleteBucketPolicyArgs> policy = ArgumentCaptor.forClass(DeleteBucketPolicyArgs.class);
        verify(minioClient).deleteBucketPolicy(policy.capture());
        assertThat(policy.getValue().bucket()).isEqualTo("submissions");
        verify(minioClient, never()).setBucketPolicy(any());
        verify(minioClient, never()).makeBucket(any());
    }

    @Test
    void newSubmissionsBucketNeverGetsAnonymousReadPolicy() throws Exception {
        when(minioClient.bucketExists(any())).thenReturn(false);
        fileStorageService.reconcileSubmissionPrivacy();
        verify(minioClient).makeBucket(any());
        verify(minioClient).deleteBucketPolicy(any());
        verify(minioClient, never()).setBucketPolicy(any());
    }

    @Test
    void startupFailsClosedIfExistingBucketCannotBeSecured() throws Exception {
        when(minioClient.bucketExists(any())).thenThrow(new IllegalStateException("unavailable"));
        assertThatThrownBy(fileStorageService::reconcileSubmissionPrivacy)
                .isInstanceOf(IllegalStateException.class).hasMessage("Cannot secure submissions bucket");
    }

    @Test
    void newPublicAssetBucketStillGetsPublicReadPolicy() throws Exception {
        when(minioClient.bucketExists(any())).thenReturn(false);
        when(minioPropertiesConfig.getPublicEndpoint()).thenReturn("http://localhost:9000");
        fileStorageService.uploadCompetitionPromo(new MockMultipartFile("file", "promo.png", "image/png", "image".getBytes()));
        ArgumentCaptor<SetBucketPolicyArgs> policy = ArgumentCaptor.forClass(SetBucketPolicyArgs.class);
        verify(minioClient).setBucketPolicy(policy.capture());
        assertThat(policy.getValue().bucket()).isEqualTo("competition-assets");
        assertThat(policy.getValue().config()).contains("s3:GetObject");
        verify(minioClient, never()).deleteBucketPolicy(any());
    }

    @Test
    void existingPublicAssetBucketPolicyIsUntouched() throws Exception {
        when(minioClient.bucketExists(any())).thenReturn(true);
        when(minioPropertiesConfig.getPublicEndpoint()).thenReturn("http://localhost:9000");
        fileStorageService.uploadCompetitionPromo(new MockMultipartFile("file", "promo.png", "image/png", "image".getBytes()));
        verify(minioClient, never()).setBucketPolicy(any());
        verify(minioClient, never()).deleteBucketPolicy(any());
    }

    @Test
    void privateReadUsesOnlyTheSubmissionBucketAndReturnsAnUnbufferedResource() throws Exception {
        when(minioClient.bucketExists(any())).thenReturn(true);
        GetObjectResponse stream = mock(GetObjectResponse.class);
        when(minioClient.getObject(any())).thenReturn(stream);
        var resource = fileStorageService.readSubmission("entry.pdf");
        assertThat(resource.getInputStream()).isSameAs(stream);
        ArgumentCaptor<GetObjectArgs> object = ArgumentCaptor.forClass(GetObjectArgs.class);
        verify(minioClient).getObject(object.capture());
        assertThat(object.getValue().bucket()).isEqualTo("submissions");
        assertThat(object.getValue().object()).isEqualTo("entry.pdf");
        verify(minioClient).deleteBucketPolicy(any());
    }

    @Test
    void malformedObjectKeysAreRejectedBeforeStorageAccess() {
        for (String key : new String[]{null, "", "../avatar.png", "user-avatar/entry.png", "entry.pdf/", "."}) {
            assertThatThrownBy(() -> fileStorageService.readSubmission(key))
                    .isInstanceOf(BusinessException.class).hasMessage("Invalid submission object name");
        }
        verifyNoInteractions(minioClient);
    }

    @Test
    void privateReadReportsStorageOutage() throws Exception {
        when(minioClient.bucketExists(any())).thenThrow(new IllegalStateException("unavailable"));
        assertThatThrownBy(() -> fileStorageService.readSubmission("entry.pdf"))
                .isInstanceOf(BusinessException.class).hasMessage("Submission storage unavailable");
    }

    @Test
    void missingPrivateObjectIsReportedAsNotFound() throws Exception {
        when(minioClient.bucketExists(any())).thenReturn(true);
        var error = mock(io.minio.messages.ErrorResponse.class);
        when(error.code()).thenReturn("NoSuchKey");
        var exception = mock(io.minio.errors.ErrorResponseException.class);
        when(exception.errorResponse()).thenReturn(error);
        when(minioClient.getObject(any())).thenThrow(exception);
        assertThatThrownBy(() -> fileStorageService.readSubmission("entry.pdf"))
                .isInstanceOf(BusinessException.class).hasMessage("Submission file not found");
    }

    @Test
    void minioAccessFailureDoesNotRevealPrivateObjectDetails() throws Exception {
        when(minioClient.bucketExists(any())).thenReturn(true);
        var error = mock(io.minio.messages.ErrorResponse.class);
        when(error.code()).thenReturn("AccessDenied");
        var exception = mock(io.minio.errors.ErrorResponseException.class);
        when(exception.errorResponse()).thenReturn(error);
        when(minioClient.getObject(any())).thenThrow(exception);
        assertThatThrownBy(() -> fileStorageService.readSubmission("entry.pdf"))
                .isInstanceOf(BusinessException.class).hasMessage("Submission storage unavailable");
    }
}
