package com.w16a.danish.common.domain.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Unified API response envelope.
 * New endpoints should return {@code ApiResponse<T>} for consistency.
 *
 * <pre>
 * // Success
 * return ResponseEntity.ok(ApiResponse.ok(result));
 *
 * // Error
 * return ResponseEntity.badRequest().body(ApiResponse.error("Invalid request"));
 * </pre>
 *
 * @author Eddy ZHANG
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "ApiResponse", description = "Standard API response envelope")
public class ApiResponse<T> {

    @Schema(description = "Whether the request succeeded")
    private boolean success;

    @Schema(description = "Response data payload (null on error)")
    private T data;

    @Schema(description = "Error message (null on success)")
    private String error;

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .error(null)
                .build();
    }

    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .data(null)
                .error(message)
                .build();
    }
}
