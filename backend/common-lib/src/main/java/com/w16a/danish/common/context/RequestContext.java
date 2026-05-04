package com.w16a.danish.common.context;

import com.w16a.danish.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

/**
 * Immutable identity context extracted from the JWT by the API gateway.
 * Injected into controller method parameters via {@link CurrentUser} and
 * {@link RequestContextArgumentResolver}.
 *
 * <p>Controllers declare:
 * <pre>{@code
 *   public ResponseEntity<?> someEndpoint(@CurrentUser RequestContext ctx) { ... }
 * }</pre>
 *
 * @param userId the authenticated user's ID (UUID string)
 * @param role   the authenticated user's role (for example ADMIN, ORGANIZER, JUDGE, PARTICIPANT)
 *
 * @author Eddy ZHANG
 */
public record RequestContext(String userId, String role) {

    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(role);
    }

    public boolean isOrganizer() {
        return "ORGANIZER".equalsIgnoreCase(role);
    }

    public boolean isJudge() {
        return "JUDGE".equalsIgnoreCase(role);
    }

    public boolean isParticipant() {
        return "PARTICIPANT".equalsIgnoreCase(role);
    }

    /**
     * Returns true if this context's role matches any supplied role
     * case-insensitively.
     */
    public boolean hasAnyRole(String... roles) {
        for (String requiredRole : roles) {
            if (requiredRole.equalsIgnoreCase(role)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Throws {@link BusinessException} (403) if the caller does not hold at
     * least one of the required roles.
     *
     * @param roles allowed role names (case-insensitive)
     */
    public void requireAnyRole(String... roles) {
        if (!hasAnyRole(roles)) {
            throw new BusinessException(
                    HttpStatus.FORBIDDEN,
                    "Access denied - required role(s): " + String.join(", ", roles)
            );
        }
    }
}
