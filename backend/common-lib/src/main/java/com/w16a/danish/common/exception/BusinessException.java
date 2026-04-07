package com.w16a.danish.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Domain-level business exception.
 * Throw this to signal a known, expected error (e.g. 404 Not Found, 403 Forbidden).
 * The GlobalExceptionHandler converts it to the appropriate HTTP response.
 *
 * @author Eddy ZHANG
 */
@Getter
public class BusinessException extends RuntimeException {

    private final HttpStatus status;

    public BusinessException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
