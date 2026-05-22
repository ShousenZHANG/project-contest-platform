package com.w16a.danish.gateway;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.w16a.danish.gateway.config.JwtConfig;
import com.w16a.danish.gateway.util.JwtUtil;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.util.HashMap;
import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;

/**
 * ✅ Integration tests for JwtAuthFilter in API Gateway.
 * This test suite verifies:
 * - Public paths allow unauthenticated access.
 * - Protected paths reject unauthenticated requests (missing or invalid JWT).
 * Note: We intentionally do NOT test successful access with valid JWT here,
 * as the main goal is to validate the gateway's authorization enforcement.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS) // Reuse WireMockServer across all test cases
class JwtAuthFilterTest {

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private JwtConfig jwtConfig;

    @Autowired
    private JwtUtil jwtUtil;

    private WireMockServer wireMockServer;

    /**
     * Start WireMock server before all tests.
     * Mocks backend endpoints for testing.
     */
    @BeforeAll
    void startWireMock() {
        wireMockServer = new WireMockServer(9999);
        wireMockServer.start();

        // ✅ Mock public endpoint: /users/login (no authentication required)
        wireMockServer.stubFor(get(urlEqualTo("/users/login"))
                .willReturn(okJson("{\"message\": \"Login OK\"}")));

        // ✅ Mock protected endpoint: /users/profile (authentication required)
        wireMockServer.stubFor(get(urlEqualTo("/users/profile"))
                .willReturn(okJson("{\"message\": \"Profile OK\"}")));
    }

    /**
     * Stop WireMock server after all tests.
     */
    @AfterAll
    void stopWireMock() {
        if (wireMockServer != null) {
            wireMockServer.stop();
        }
    }

    /**
     * Generate a valid JWT token for future extended tests (if needed).
     *
     * @return Signed JWT token string.
     */
    private String generateValidToken() {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", "test-user");
        claims.put("role", "PARTICIPANT");

        long expirationSeconds = 3600; // 1 hour validity

        return jwtUtil.generateToken(claims, jwtConfig.getSecret(), expirationSeconds);
    }

    /**
     * ✅ Public path should allow unauthenticated access (no JWT required).
     */
    @Test
    @DisplayName("✅ Public path should allow unauthenticated access")
    void testPublicPathShouldBypassJwtCheck() {
        webTestClient.get()
                .uri("/users/login")
                .exchange()
                .expectStatus().isOk(); // Expect HTTP 200 OK without token
    }

    /**
     * 🛡️ Protected path without any token should be blocked (401 Unauthorized).
     */
    @Test
    @DisplayName("🛡️ Protected path without token should be blocked with 401")
    void testProtectedPathWithoutTokenShouldBeBlocked() {
        webTestClient.get()
                .uri("/users/profile")
                .exchange()
                .expectStatus().isUnauthorized(); // Expect HTTP 401 Unauthorized
    }

    /**
     * 🛡️ Protected path with invalid token should be blocked (401 Unauthorized).
     */
    @Test
    @DisplayName("🛡️ Protected path with invalid token should be blocked with 401")
    void testProtectedPathWithInvalidTokenShouldBeBlocked() {
        webTestClient.get()
                .uri("/users/profile")
                .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.token.here")
                .exchange()
                .expectStatus().isUnauthorized(); // Expect HTTP 401 Unauthorized
    }

    /**
     * 🛡️ Defense-in-depth: a client must NOT be able to forge identity headers.
     * Even on a public path, any inbound User-ID/User-Role must be stripped by the
     * filter so a downstream service can never receive an attacker-supplied identity.
     */
    @Test
    @DisplayName("🛡️ Forged User-ID/User-Role headers are stripped before reaching downstream")
    void testForgedIdentityHeadersAreStripped() {
        webTestClient.get()
                .uri("/users/login")
                .header("User-ID", "attacker-forged-id")
                .header("User-Role", "ADMIN")
                .exchange()
                .expectStatus().isOk();

        wireMockServer.verify(getRequestedFor(urlEqualTo("/users/login"))
                .withoutHeader("User-ID")
                .withoutHeader("User-Role"));
    }

}
