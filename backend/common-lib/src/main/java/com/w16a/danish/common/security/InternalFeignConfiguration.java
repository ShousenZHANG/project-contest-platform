package com.w16a.danish.common.security;

import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import java.util.Set;

/** Attach explicitly to first-party Feign clients; never component-scan this configuration. */
public class InternalFeignConfiguration {
    @Bean
    public RequestInterceptor serviceRequestAuthentication(ServiceTokenService tokens, Environment environment) {
        String caller = environment.getRequiredProperty("spring.application.name");
        return request -> {
            String audience = request.feignTarget().name();
            String path = request.path();
            // Never forward an inherited credential to OAuth or an ordinary public read.
            request.removeHeader(ServiceTokenService.HEADER);
            String scope = null;
            if ("file-service".equals(audience)) {
                if (path.endsWith("/upload/avatar")) scope = "files:avatar:upload";
                else if (path.endsWith("/upload/promo")) scope = "files:promo:upload";
                else if (path.endsWith("/upload/submission")) scope = "files:submission:upload";
                else if (path.endsWith("/internal/submission")) scope = "files:submission:read";
                else if (path.endsWith("/delete")) scope = "files:delete";
            } else if (Set.of("user-service", "competition-service", "registration-service", "interaction-service", "judge-service")
                    .contains(audience) && (path.contains("/internal/") || path.endsWith("/internal")
                    || ("competition-service".equals(audience) && path.endsWith("/status")))) {
                boolean userQuery = "user-service".equals(audience) && "POST".equals(request.method())
                        && Set.of("/users/internal/query-by-ids", "/users/internal/query-by-emails", "/teams/internal/brief").contains(path);
                scope = "GET".equals(request.method()) || userQuery ? "internal:read" : "internal:write";
            }
            if (scope != null) {
                request.header(ServiceTokenService.HEADER, tokens.issue(caller, audience, scope));
            }
        };
    }
}
