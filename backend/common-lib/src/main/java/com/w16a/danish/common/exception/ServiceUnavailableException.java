package com.w16a.danish.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a downstream service (invoked via Feign) is unavailable or
 * returns a fault that indicates a transient infrastructure failure.
 *
 * <p>Feign fallback implementations should throw this instead of returning
 * opaque HTTP 500 responses, allowing the {@code GlobalExceptionHandler} to
 * emit a consistent 503 envelope and callers to distinguish transient failures
 * from domain errors.
 *
 * <p>Example fallback:
 * <pre>{@code
 *   @Override
 *   public ResponseEntity<String> uploadCompetitionPromo(MultipartFile file) {
 *       log.error("[Fallback] file-service unavailable — uploadCompetitionPromo");
 *       throw new ServiceUnavailableException("file-service", "uploadCompetitionPromo");
 *   }
 * }</pre>
 *
 * @author Eddy ZHANG
 */
public class ServiceUnavailableException extends BusinessException {

    private final String serviceName;
    private final String operation;

    public ServiceUnavailableException(String serviceName, String operation) {
        super(HttpStatus.SERVICE_UNAVAILABLE,
              String.format("Service '%s' is currently unavailable (operation: %s). Please retry later.",
                            serviceName, operation));
        this.serviceName = serviceName;
        this.operation   = operation;
    }

    public String getServiceName() { return serviceName; }
    public String getOperation()   { return operation; }
}
