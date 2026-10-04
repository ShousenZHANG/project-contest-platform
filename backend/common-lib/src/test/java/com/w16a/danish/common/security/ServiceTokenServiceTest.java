package com.w16a.danish.common.security;

import cn.hutool.jwt.JWTUtil;
import com.w16a.danish.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class ServiceTokenServiceTest {
    private static final String KEY = "service-key-that-is-distinct-and-at-least-32";
    private static final Clock NOW = Clock.fixed(Instant.ofEpochSecond(1000), ZoneOffset.UTC);
    private final ServiceTokenService tokens = new ServiceTokenService(KEY, "browser-key", NOW);

    @Test
    void validCredentialAuthenticatesItsExactCallerAudienceAndScope() {
        assertThat(tokens.authenticate(tokens.issue("judge-service", "registration-service", "internal:write"),
                "registration-service", "internal:write", List.of("judge-service"))).isEqualTo("judge-service");
    }

    @Test
    void credentialCannotCrossAudienceCallerOrScope() {
        String credential = tokens.issue("judge-service", "registration-service", "internal:read");
        assertDenied(credential, "competition-service", "internal:read", List.of("judge-service"));
        assertDenied(credential, "registration-service", "internal:write", List.of("judge-service"));
        assertDenied(credential, "registration-service", "internal:read", List.of("user-service"));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "forged", "Bearer bad", "Bearer a.b.c", "Bearer a.b.c.d", "Bearer .."})
    void malformedAndMissingCredentialsAreDenied(String credential) {
        assertDenied(credential, "registration-service", "internal:read", List.of("judge-service"));
    }

    @Test
    void expiredCredentialAndBrowserSignedTokenAreDenied() {
        String credential = tokens.issue("judge-service", "registration-service", "internal:read");
        ServiceTokenService later = new ServiceTokenService(KEY, "browser-key",
                Clock.fixed(Instant.ofEpochSecond(1060), ZoneOffset.UTC));
        assertThatThrownBy(() -> later.authenticate(credential, "registration-service", "internal:read", List.of("judge-service")))
                .isInstanceOf(BusinessException.class);
        String browserToken = "Bearer " + JWTUtil.createToken(claims(), "browser-key".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertDenied(browserToken, "registration-service", "internal:read", List.of("judge-service"));
    }

    @Test
    void missingFutureOverlongAndInvalidTimestampsAreDenied() {
        for (Map<String, Object> changes : List.<Map<String, Object>>of(Map.of("iat", 1001L), Map.of("exp", 1000L),
                Map.of("exp", 999L), Map.of("exp", 1061L), Map.of("iat", 900L, "exp", 1010L), Map.of("iat", "invalid"))) {
            Map<String, Object> payload = claims();
            payload.putAll(changes);
            assertDenied(signed(payload), "registration-service", "internal:read", List.of("judge-service"));
        }
        for (String missing : List.of("iat", "exp", "sub", "aud", "scope")) {
            Map<String, Object> payload = claims();
            payload.remove(missing);
            assertDenied(signed(payload), "registration-service", "internal:read", List.of("judge-service"));
        }
    }

    @Test
    void missingOrSharedOrShortSecretCannotIssueCredentials() {
        ServiceTokenService missing = new ServiceTokenService("", "browser-key", NOW);
        assertThatThrownBy(() -> missing.issue("judge-service", "registration-service", "internal:read"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> missing.authenticate("Bearer ..", "registration-service", "internal:read", List.of("judge-service")))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> new ServiceTokenService(KEY, KEY)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ServiceTokenService("short", "browser-key")).isInstanceOf(IllegalArgumentException.class);
        ServiceTokenService absent = new ServiceTokenService(null, "browser-key", NOW);
        assertThatThrownBy(() -> absent.issue("judge-service", "registration-service", "internal:read"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> absent.authenticate(null, "registration-service", "internal:read", List.of("judge-service")))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void signedTokenWithWrongAlgorithmOrTypeIsRejected() throws Exception {
        assertDenied(signedWithHeader("HS512", "JWT"), "registration-service", "internal:read", List.of("judge-service"));
        assertDenied(signedWithHeader("HS256", "other"), "registration-service", "internal:read", List.of("judge-service"));
    }

    private String signedWithHeader(String algorithm, String type) throws Exception {
        var encoder = java.util.Base64.getUrlEncoder().withoutPadding();
        String header = encoder.encodeToString(cn.hutool.json.JSONUtil.toJsonStr(Map.of("alg", algorithm, "typ", type))
                .getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String payload = encoder.encodeToString(cn.hutool.json.JSONUtil.toJsonStr(claims()).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String signingInput = header + "." + payload;
        javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new javax.crypto.spec.SecretKeySpec(KEY.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
        return "Bearer " + signingInput + "." + encoder.encodeToString(mac.doFinal(signingInput.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }

    private Map<String, Object> claims() {
        return new HashMap<>(Map.of("sub", "judge-service", "aud", "registration-service", "scope", "internal:read", "iat", 1000L, "exp", 1060L));
    }

    private String signed(Map<String, Object> payload) {
        return "Bearer " + JWTUtil.createToken(payload, KEY.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private void assertDenied(String credential, String audience, String scope, List<String> callers) {
        assertThatThrownBy(() -> tokens.authenticate(credential, audience, scope, callers))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getStatus().value()).isEqualTo(403);
    }
}
