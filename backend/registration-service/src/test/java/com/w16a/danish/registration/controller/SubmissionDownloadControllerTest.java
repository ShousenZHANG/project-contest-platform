package com.w16a.danish.registration.controller;

import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.context.RequestContextArgumentResolver;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.common.exception.GlobalExceptionHandler;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.service.SubmissionDownloads;
import feign.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SubmissionDownloadControllerTest {
    private SubmissionDownloads downloads;
    private SubmissionDownloadController controller;
    private Response upstream;
    private Response.Body body;
    private SubmissionRecords submission;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        downloads = mock(SubmissionDownloads.class);
        controller = new SubmissionDownloadController(downloads);
        submission = new SubmissionRecords().setId("s1").setFileName("upload.html");
        upstream = mock(Response.class);
        body = mock(Response.Body.class);
        when(upstream.status()).thenReturn(200);
        when(upstream.body()).thenReturn(body);
        when(downloads.requireAccessible("s1", null)).thenReturn(submission);
        when(downloads.open(submission)).thenReturn(upstream);
        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new RequestContextArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void successfulDownloadIsLazyStreamingAndClosesBothSourceAndFeignResponse() throws Exception {
        byte[] bytes = "<script>download only</script>".getBytes(StandardCharsets.UTF_8);
        var input = spy(new ByteArrayInputStream(bytes));
        when(body.asInputStream()).thenReturn(input);

        var response = controller.downloadPublic("s1");

        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_OCTET_STREAM);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).startsWith("attachment;").contains("upload.html");
        assertThat(response.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(response.getHeaders().getCacheControl()).isEqualTo("private, no-store");
        verify(body, never()).asInputStream();
        verify(upstream, never()).close();
        var output = new ByteArrayOutputStream();
        response.getBody().writeTo(output);
        assertThat(output.toByteArray()).isEqualTo(bytes);
        verify(input).close();
        verify(upstream).close();
    }

    @ParameterizedTest
    @ValueSource(ints = {404, 403, 503})
    void upstreamFailureClosesResponseAndReturns503(int status) {
        when(upstream.status()).thenReturn(status);
        assertThatThrownBy(() -> controller.downloadPublic("s1")).isInstanceOfSatisfying(BusinessException.class,
                error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
        verify(upstream).close();
    }

    @Test
    void missingSourceBodyFailsBeforeWritingSuccess() {
        when(upstream.body()).thenReturn(null);
        assertThatThrownBy(() -> controller.downloadPublic("s1")).isInstanceOf(BusinessException.class);
        verify(upstream).close();
    }

    @Test
    void authenticatedRouteRequiresIdentityAndDoesNotFallBackToAnonymousPublicAccess() throws Exception {
        mvc.perform(get("/submissions/s1/download")).andExpect(status().isUnauthorized());
        verifyNoInteractions(downloads);
    }

    @Test
    void authenticatedRoutePassesResolvedIdentityThroughTheDomainAcl() throws Exception {
        var user = new RequestContext("member1", "PARTICIPANT");
        when(downloads.requireAccessible("s1", user)).thenThrow(new BusinessException(HttpStatus.FORBIDDEN, "You cannot download this submission"));
        mvc.perform(get("/submissions/s1/download").header("User-ID", "member1").header("User-Role", "PARTICIPANT"))
                .andExpect(status().isForbidden());
        verify(downloads).requireAccessible("s1", user);
        verify(downloads, never()).open(any());
    }

    @Test
    void malformedStoredFilenameIsSafeForTheAttachmentHeader() {
        submission.setFileName("../evil\r\n\\file.html");
        var response = controller.downloadPublic("s1");
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .doesNotContain("\r", "\n", "\\file", "../").startsWith("attachment;");
    }
}
