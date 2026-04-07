package com.w16a.danish.gateway.filters;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.w16a.danish.gateway.config.JwtConfig;
import com.w16a.danish.gateway.util.JwtUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.HashMap;


/**
 * @author Eddy ZHANG
 * @date 2025/03/16
 * @description JWT Authentication Filter.
 * Public-url patterns in application.yml support two formats:
 *   - Plain path:      /users/login        (allows all HTTP methods)
 *   - Method-prefixed: GET:/competitions/* (allows only that HTTP method)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter implements GlobalFilter, Ordered {

    private final JwtConfig jwtConfig;
    private final JwtUtil jwtUtil;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        ServerHttpResponse response = exchange.getResponse();
        String path = request.getURI().getPath();

        // whitelist public URLs (supports METHOD:path and plain path patterns)
        if (isPublicPath(request)) {
            return chain.filter(exchange);
        }

        // get JWT token from Authorization header
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (StrUtil.isBlank(authHeader) || !authHeader.startsWith("Bearer ")) {
            log.warn("Missing/invalid Authorization header: method={} path={}", request.getMethod(), path);
            return unauthorizedResponse(response, "Missing or invalid Authorization header");
        }

        // JWT token verification
        String token = authHeader.substring(7);

        Optional<Map<String, Object>> claimsOpt = jwtUtil.parseAndVerifyToken(token, jwtConfig.getSecret());

        if (claimsOpt.isEmpty()) {
            log.warn("Invalid or expired JWT token: method={} path={}", request.getMethod(), path);
            return unauthorizedResponse(response, "Invalid or expired JWT Token");
        }

        // get user information from JWT claims
        Map<String, Object> claims = claimsOpt.get();
        String userId = StrUtil.toString(claims.get("userId"));
        String userRole = StrUtil.toString(claims.get("role"));

        if (StrUtil.isBlank(userId) || StrUtil.isBlank(userRole)) {
            return unauthorizedResponse(response, "Invalid user information in JWT");
        }

        // add user information to request headers
        ServerHttpRequest modifiedRequest = request.mutate()
                .header("User-ID", userId)
                .header("User-Role", userRole)
                .build();

        return chain.filter(exchange.mutate().request(modifiedRequest).build());
    }

    @Override
    public int getOrder() {
        return -1;
    }

    /**
     * Check if the request is in the public URL whitelist.
     * Patterns may be plain paths (/users/login) or method-prefixed (GET:/competitions/*).
     */
    private boolean isPublicPath(ServerHttpRequest request) {
        String path = request.getURI().getPath();
        String method = request.getMethod() != null ? request.getMethod().name() : "";
        List<String> publicUrls = jwtConfig.getPublicUrls();
        if (publicUrls == null) return false;
        return publicUrls.stream().anyMatch(pattern -> {
            int colon = pattern.indexOf(':');
            if (colon > 0 && colon < 8 && !pattern.startsWith("/")) {
                // METHOD:path format — match both method and path
                String patternMethod = pattern.substring(0, colon).toUpperCase();
                String patternPath = pattern.substring(colon + 1);
                return patternMethod.equals(method) && pathMatcher.match(patternPath, path);
            }
            // Plain path pattern — allow any method
            return pathMatcher.match(pattern, path);
        });
    }

    /**
     * Return an unauthorized response with the specified message
     *
     * @param response response
     * @param message error message
     * @return {@link Mono }<{@link Void }> response
     */
    private Mono<Void> unauthorizedResponse(ServerHttpResponse response, String message) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> errorBody = new HashMap<>();
        errorBody.put("status", HttpStatus.UNAUTHORIZED.value());
        errorBody.put("error", "Unauthorized");
        errorBody.put("message", message);

        return Mono.defer(() -> response.writeWith(
                Mono.just(response.bufferFactory().wrap(JSONUtil.toJsonStr(errorBody).getBytes(StandardCharsets.UTF_8)))
        ));
    }

}
