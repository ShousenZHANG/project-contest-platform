package com.w16a.danish.common.web;

import com.w16a.danish.common.domain.vo.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Controller response factory for the standard {@link ApiResponse} envelope.
 */
public final class ApiResponses {

    private ApiResponses() {
    }

    public static <T> ResponseEntity<ApiResponse<T>> ok(T data) {
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    public static ResponseEntity<ApiResponse<String>> message(String message) {
        return ok(message);
    }

    public static <T> ResponseEntity<ApiResponse<T>> status(HttpStatus status, T data) {
        return ResponseEntity.status(status).body(ApiResponse.ok(data));
    }

    public static <T> ResponseEntity<ApiResponse<T>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(ApiResponse.error(message));
    }
}
