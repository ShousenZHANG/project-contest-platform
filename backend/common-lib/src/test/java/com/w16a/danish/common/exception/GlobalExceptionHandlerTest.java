package com.w16a.danish.common.exception;

import com.w16a.danish.common.domain.vo.ApiResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * This handler is the last thing between a thrown exception and the client, so it decides both
 * the status every service reports and how much of an internal failure leaks out.
 *
 * <p>Every service in the platform shares it. A change here changes seven APIs at once, which is
 * exactly why it is worth pinning.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("A domain failure keeps its own status rather than being flattened to 500")
    void businessExceptionKeepsItsStatus() {
        ResponseEntity<ApiResponse<Void>> response =
                handler.handleBusinessException(new BusinessException(HttpStatus.CONFLICT, "Already voted"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getError()).isEqualTo("Already voted");
    }

    @Test
    @DisplayName("An unreachable service reports 503, so callers can tell a retry from a real error")
    void serviceUnavailableIsReportedAsTransient() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleBusinessException(
                new ServiceUnavailableException("competition-service", "getCompetitionById"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError())
                .contains("competition-service")
                .contains("getCompetitionById");
    }

    @Test
    @DisplayName("An unexpected exception never leaks its message to the client")
    void unexpectedExceptionsDoNotLeakInternals() {
        Exception leaky = new IllegalStateException(
                "Duplicate entry 'abc' for key 'users.email' at jdbc:mysql://mysql:3306/project_contest_platform");

        ResponseEntity<ApiResponse<Void>> response = handler.handleGenericException(leaky);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError()).isEqualTo("Internal Server Error");
        assertThat(response.getBody().getError())
                .doesNotContain("jdbc")
                .doesNotContain("users.email")
                .doesNotContain("mysql");
    }

    @Test
    @DisplayName("Validation failures name every offending field, so a form can highlight them")
    void validationFailuresCarryFieldErrors() throws NoSuchMethodException {
        BindingResult binding = new BeanPropertyBindingResult(new Object(), "createCompetitionDTO");
        binding.addError(new org.springframework.validation.FieldError(
                "createCompetitionDTO", "name", "must not be blank"));
        binding.addError(new org.springframework.validation.FieldError(
                "createCompetitionDTO", "endDate", "must be in the future"));

        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(
                new MethodParameter(this.getClass().getDeclaredMethod("stubEndpoint", String.class), 0),
                binding);

        ResponseEntity<ApiResponse<Map<String, String>>> response = handler.handleValidationException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getError()).isEqualTo("Validation failed");
        assertThat(response.getBody().getData())
                .containsEntry("name", "must not be blank")
                .containsEntry("endDate", "must be in the future");
    }

    @Test
    @DisplayName("A request that skipped the gateway is 401, not 400")
    void missingIdentityHeaderIsUnauthorized() throws NoSuchMethodException {
        MissingRequestHeaderException ex = new MissingRequestHeaderException(
                "User-ID",
                new MethodParameter(this.getClass().getDeclaredMethod("stubEndpoint", String.class), 0));

        ResponseEntity<ApiResponse<Void>> response = handler.handleMissingHeaderException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError()).isEqualTo("Missing or invalid Authorization header");
    }

    @SuppressWarnings("unused")
    private void stubEndpoint(String userId) {
        // Only exists so the tests above can build a MethodParameter; never called.
    }
}
