package com.w16a.danish.gateway;

import com.w16a.danish.gateway.config.JwtConfig;
import com.w16a.danish.gateway.filters.JwtAuthFilter;
import com.w16a.danish.gateway.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class JwtAuthFilterServiceRoutesTest {
    private final JwtConfig config = mock(JwtConfig.class);
    private final JwtUtil jwt = mock(JwtUtil.class);
    private final JwtAuthFilter filter = new JwtAuthFilter(config, jwt);

    @ParameterizedTest
    @ValueSource(strings = {
            "/submissions/internal/scored", "/registrations/internal/exists-registration-by-team",
            "/competitions/c1/status", "/competitions/c1/status/", "/files/upload/avatar", "/files/delete",
            "/registration-service/submissions/internal/scored", "/competition-service/competitions/c1/status",
            "/SUBMISSIONS/INTERNAL/scored", "/submissions/in%74ernal/scored", "/submissions/%2569nternal/scored",
            "/submissions//internal/scored", "/submissions/internal;parameter/scored", "/submissions/./internal/scored"
    })
    void serviceOnlyAndAliasPathsAreRejectedBeforeAnyWhitelistOrBrowserJwt(String path) {
        when(config.getPublicUrls()).thenReturn(List.of("/**"));
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.get(path)
                .header("Authorization", "Bearer valid-browser-token")
                .header("X-Service-Authorization", "Bearer forged-service-token"));
        GatewayFilterChain chain = mock(GatewayFilterChain.class);

        filter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode().value()).isEqualTo(403);
        verifyNoInteractions(chain, jwt);
    }

    @Test
    void publicRequestStripsAllIdentityAndServiceHeaders() {
        when(config.getPublicUrls()).thenReturn(List.of("/users/login"));
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/users/login")
                .header("User-ID", "attacker").header("User-Role", "ADMIN")
                .header("X-Service-Authorization", "forged").header("x-service-caller", "judge-service")
                .header("Service-ID", "judge-service").header("X-Internal-Token", "forged"));
        AtomicReference<org.springframework.web.server.ServerWebExchange> forwarded = new AtomicReference<>();
        filter.filter(exchange, request -> { forwarded.set(request); return Mono.empty(); }).block();

        var headers = forwarded.get().getRequest().getHeaders();
        assertThat(headers.headerNames()).doesNotContain("User-ID", "User-Role", "X-Service-Authorization", "x-service-caller", "Service-ID", "X-Internal-Token");
        verifyNoInteractions(jwt);
    }

    @Test
    void protectedRequestRetainsOnlyVerifiedBrowserIdentity() {
        when(config.getPublicUrls()).thenReturn(List.of());
        when(config.getSecret()).thenReturn("browser-key");
        when(jwt.parseAndVerifyToken("valid", "browser-key"))
                .thenReturn(Optional.of(Map.of("userId", "u1", "role", "PARTICIPANT")));
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/users/profile")
                .header("Authorization", "Bearer valid").header("User-ID", "attacker").header("User-Role", "ADMIN")
                .header("X-Service-Authorization", "forged"));
        AtomicReference<org.springframework.web.server.ServerWebExchange> forwarded = new AtomicReference<>();
        filter.filter(exchange, request -> { forwarded.set(request); return Mono.empty(); }).block();

        var headers = forwarded.get().getRequest().getHeaders();
        assertThat(headers.getFirst("User-ID")).isEqualTo("u1");
        assertThat(headers.getFirst("User-Role")).isEqualTo("PARTICIPANT");
        assertThat(headers.headerNames()).doesNotContain("X-Service-Authorization");
    }
}
