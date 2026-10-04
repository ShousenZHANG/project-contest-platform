package com.w16a.danish.common.security;

import feign.RequestTemplate;
import feign.Target;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.env.MockEnvironment;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class InternalFeignConfigurationTest {
    private final ServiceTokenService tokens = new ServiceTokenService("separate-service-signing-key-at-least-32", "browser-key");
    private final feign.RequestInterceptor interceptor = new InternalFeignConfiguration().serviceRequestAuthentication(
            tokens, new MockEnvironment().withProperty("spring.application.name", "registration-service"));

    @ParameterizedTest
    @CsvSource({
            "file-service, POST, /files/upload/submission, files:submission:upload",
            "file-service, GET, /files/internal/submission, files:submission:read",
            "file-service, DELETE, /files/delete, files:delete",
            "file-service, POST, /files/upload/avatar, files:avatar:upload",
            "file-service, POST, /files/upload/promo, files:promo:upload",
            "registration-service, GET, /submissions/internal/scored, internal:read",
            "registration-service, POST, /submissions/internal/by-ids, internal:write",
            "user-service, POST, /users/internal/query-by-ids, internal:read",
            "user-service, POST, /users/internal/query-by-emails, internal:read",
            "user-service, POST, /teams/internal/brief, internal:read",
            "user-service, GET, /teams/internal/joined, internal:read",
            "competition-service, PUT, /competitions/c1/status, internal:write"
    })
    void signsOnlyTheRequestedFirstPartyOperation(String audience, String method, String path, String scope) {
        RequestTemplate request = request(audience, method, path);
        request.header(ServiceTokenService.HEADER, "forged-existing-value");
        interceptor.apply(request);
        assertThat(request.headers().get(ServiceTokenService.HEADER)).hasSize(1);
        String signed = request.headers().get(ServiceTokenService.HEADER).iterator().next();
        assertThat(tokens.authenticate(signed, audience, scope, List.of("registration-service"))).isEqualTo("registration-service");
    }

    @ParameterizedTest
    @CsvSource({"github, GET, /internal/user", "google, POST, /token", "user-service, GET, /users/u1", "file-service, GET, /unknown"})
    void externalOAuthAndOrdinaryPublicReadsNeverReceiveServiceCredentials(String audience, String method, String path) {
        RequestTemplate request = request(audience, method, path);
        request.header("Authorization", "Bearer provider-token");
        request.header(ServiceTokenService.HEADER, "must-not-leak");
        interceptor.apply(request);
        assertThat(request.headers()).doesNotContainKey(ServiceTokenService.HEADER);
        assertThat(request.headers().get("Authorization")).containsExactly("Bearer provider-token");
    }

    private RequestTemplate request(String audience, String method, String path) {
        RequestTemplate request = new RequestTemplate().method(method).uri(path);
        request.feignTarget(new Target.HardCodedTarget<>(Object.class, audience, "http://localhost"));
        return request;
    }
}
