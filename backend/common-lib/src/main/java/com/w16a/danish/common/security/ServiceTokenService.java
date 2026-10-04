package com.w16a.danish.common.security;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.w16a.danish.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/** Short-lived service JWTs use a key distinct from browser session JWTs. */
public final class ServiceTokenService {
    public static final String HEADER = "X-Service-Authorization";
    private static final long LIFETIME_SECONDS = 60;
    private final String secret;
    private final Clock clock;

    public ServiceTokenService(String secret, String userJwtSecret) {
        this(secret, userJwtSecret, Clock.systemUTC());
    }

    public ServiceTokenService(String secret, String userJwtSecret, Clock clock) {
        if (secret != null && !secret.isBlank() && (secret.length() < 32 || secret.equals(userJwtSecret))) {
            throw new IllegalArgumentException("SERVICE_JWT_SECRET must be at least 32 characters and distinct from JWT_SECRET");
        }
        this.secret = secret;
        this.clock = clock;
    }

    public String issue(String caller, String audience, String scope) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("SERVICE_JWT_SECRET is required for service requests");
        }
        long now = clock.instant().getEpochSecond();
        String payload = encode(JSONUtil.toJsonStr(Map.of(
                "sub", caller, "aud", audience, "scope", scope, "iat", now, "exp", now + LIFETIME_SECONDS)));
        String signed = encode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}") + "." + payload;
        return "Bearer " + signed + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(mac(signed));
    }

    public String authenticate(String authorization, String audience, String scope, List<String> allowedCallers) {
        try {
            if (secret == null || secret.isBlank() || authorization == null || !authorization.startsWith("Bearer ")) {
                throw denied();
            }
            String[] parts = authorization.substring(7).split("\\.", -1);
            if (parts.length != 3 || !MessageDigest.isEqual(mac(parts[0] + "." + parts[1]),
                    Base64.getUrlDecoder().decode(parts[2]))) {
                throw denied();
            }
            JSONObject header = JSONUtil.parseObj(decode(parts[0]));
            JSONObject claims = JSONUtil.parseObj(decode(parts[1]));
            long now = clock.instant().getEpochSecond();
            Long issuedAt = claims.getLong("iat");
            Long expiresAt = claims.getLong("exp");
            String caller = claims.getStr("sub");
            if (!"HS256".equals(header.getStr("alg")) || !"JWT".equals(header.getStr("typ"))
                    || !audience.equals(claims.getStr("aud")) || !scope.equals(claims.getStr("scope"))
                    || !allowedCallers.contains(caller) || issuedAt == null || expiresAt == null
                    || issuedAt > now || issuedAt < now - LIFETIME_SECONDS || expiresAt <= now
                    || expiresAt > issuedAt + LIFETIME_SECONDS) {
                throw denied();
            }
            return caller;
        } catch (BusinessException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw denied();
        }
    }

    private byte[] mac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException ex) {
            throw new IllegalStateException("Cannot sign service credentials", ex);
        }
    }

    private static String encode(String value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private static String decode(String value) {
        return new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8);
    }

    private static BusinessException denied() {
        return new BusinessException(HttpStatus.FORBIDDEN, "Service authentication required");
    }
}
