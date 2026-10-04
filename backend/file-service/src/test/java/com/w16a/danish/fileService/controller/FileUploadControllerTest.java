package com.w16a.danish.fileService.controller;

import com.w16a.danish.fileService.service.FileStorageService;
import com.w16a.danish.common.security.ServiceSecurityAutoConfiguration;
import com.w16a.danish.common.security.ServiceTokenService;
import com.w16a.danish.common.exception.GlobalExceptionHandler;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.InputStreamResource;
import java.io.ByteArrayInputStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MultipartFile;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for {@link FileUploadController}.
 * Covers upload avatar, upload promo, upload submission, and delete file APIs.
 */
@WebMvcTest(value = FileUploadController.class, properties = "service.auth.secret=test-service-secret-at-least-32-characters")
@Import({ServiceSecurityAutoConfiguration.class, GlobalExceptionHandler.class})
class FileUploadControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FileStorageService fileStorageService;

    @Autowired
    private ServiceTokenService tokens;

    private String authorization(String caller, String scope) {
        return tokens.issue(caller, "file-service", scope);
    }

    @Test
    @DisplayName("✅ Upload avatar successfully")
    void testUploadAvatarSuccess() throws Exception {
        MockMultipartFile mockFile = new MockMultipartFile(
                "file", "avatar.png", MediaType.IMAGE_PNG_VALUE, "fake image content".getBytes()
        );

        Mockito.when(fileStorageService.uploadAvatar(any(MultipartFile.class)))
                .thenReturn("http://mocked-url/avatar.png");

        mockMvc.perform(multipart("/files/upload/avatar")
                        .file(mockFile)
                        .header(ServiceTokenService.HEADER, authorization("user-service", "files:avatar:upload"))
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk())
                .andExpect(content().string("http://mocked-url/avatar.png"));
    }

    @Test
    @DisplayName("✅ Upload competition promo successfully")
    void testUploadCompetitionPromoSuccess() throws Exception {
        MockMultipartFile mockFile = new MockMultipartFile(
                "file", "promo.mp4", MediaType.APPLICATION_OCTET_STREAM_VALUE, "fake video content".getBytes()
        );

        Mockito.when(fileStorageService.uploadCompetitionPromo(any(MultipartFile.class)))
                .thenReturn("http://mocked-url/promo.mp4");

        mockMvc.perform(multipart("/files/upload/promo")
                        .file(mockFile)
                        .header(ServiceTokenService.HEADER, authorization("competition-service", "files:promo:upload"))
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk())
                .andExpect(content().string("http://mocked-url/promo.mp4"));
    }

    @Test
    @DisplayName("✅ Upload submission successfully")
    void testUploadSubmissionSuccess() throws Exception {
        MockMultipartFile mockFile = new MockMultipartFile(
                "file", "submission.pdf", MediaType.APPLICATION_PDF_VALUE, "fake pdf content".getBytes()
        );

        Mockito.when(fileStorageService.uploadSubmission(any(MultipartFile.class)))
                .thenReturn("submission-folder/submission.pdf");

        mockMvc.perform(multipart("/files/upload/submission")
                        .file(mockFile)
                        .header(ServiceTokenService.HEADER, authorization("registration-service", "files:submission:upload"))
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk())
                .andExpect(content().string("submission-folder/submission.pdf"));
    }

    @Test
    @DisplayName("✅ Delete file successfully")
    void testDeleteFileSuccess() throws Exception {
        Mockito.doNothing().when(fileStorageService).deleteFile(anyString(), anyString());

        mockMvc.perform(delete("/files/delete")
                        .header(ServiceTokenService.HEADER, authorization("user-service", "files:delete"))
                        .param("bucket", "user-avatar")
                        .param("objectName", "test-file.png"))
                .andExpect(status().isOk())
                .andExpect(content().string("File deleted successfully."));
    }

    @Test
    void rejectsBrowserAndSpoofedCallerHeaders() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "entry.zip", "application/zip", "zip".getBytes());
        mockMvc.perform(multipart("/files/upload/submission").file(file)
                        .header("User-ID", "attacker").header("User-Role", "ADMIN")
                        .header("X-Service-Caller", "registration-service"))
                .andExpect(status().isForbidden());
        Mockito.verifyNoInteractions(fileStorageService);
    }

    @Test
    void wrongCallerCannotUploadToAnotherDomain() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "entry.zip", "application/zip", "zip".getBytes());
        mockMvc.perform(multipart("/files/upload/submission").file(file)
                        .header(ServiceTokenService.HEADER, authorization("user-service", "files:submission:upload")))
                .andExpect(status().isForbidden());
        Mockito.verifyNoInteractions(fileStorageService);
    }

    @Test
    void deleteCannotCrossCallerBucketScope() throws Exception {
        mockMvc.perform(delete("/files/delete").param("bucket", "submissions").param("objectName", "other.zip")
                        .header(ServiceTokenService.HEADER, authorization("user-service", "files:delete")))
                .andExpect(status().isForbidden());
        Mockito.verifyNoInteractions(fileStorageService);
    }

    @Test
    void approvedDomainCallerCanStreamPrivateSubmission() throws Exception {
        Mockito.when(fileStorageService.readSubmission("entry.zip"))
                .thenReturn(new InputStreamResource(new ByteArrayInputStream("content".getBytes())));
        mockMvc.perform(get("/files/internal/submission").param("objectName", "entry.zip")
                        .header(ServiceTokenService.HEADER, authorization("registration-service", "files:submission:read")))
                .andExpect(status().isOk())
                .andExpect(content().bytes("content".getBytes()))
                .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    void uploadCredentialCannotReadPrivateSubmission() throws Exception {
        mockMvc.perform(get("/files/internal/submission").param("objectName", "entry.zip")
                        .header(ServiceTokenService.HEADER, authorization("registration-service", "files:submission:upload")))
                .andExpect(status().isForbidden());
        Mockito.verifyNoInteractions(fileStorageService);
    }
}
