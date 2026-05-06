package com.w16a.danish.common.web;

import com.w16a.danish.common.domain.vo.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class ApiResponsesTest {

    @Test
    void messageWrapsSuccessfulStrings() {
        ResponseEntity<ApiResponse<String>> response = ApiResponses.message("Done");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData()).isEqualTo("Done");
        assertThat(response.getBody().getError()).isNull();
    }

    @Test
    void errorWrapsFailurePayloads() {
        ResponseEntity<ApiResponse<Void>> response = ApiResponses.error(HttpStatus.UNAUTHORIZED, "No token");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getError()).isEqualTo("No token");
    }
}
