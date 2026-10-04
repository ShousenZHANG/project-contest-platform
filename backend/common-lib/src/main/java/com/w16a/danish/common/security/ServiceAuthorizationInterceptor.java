package com.w16a.danish.common.security;

import com.w16a.danish.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.HttpStatus;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.util.UriUtils;

import java.util.List;
import java.nio.charset.StandardCharsets;

public final class ServiceAuthorizationInterceptor implements HandlerInterceptor {
    public static final String CALLER_ATTRIBUTE = ServiceAuthorizationInterceptor.class.getName() + ".caller";
    private final ServiceTokenService tokens;
    private final String audience;

    public ServiceAuthorizationInterceptor(ServiceTokenService tokens, String audience) {
        this.tokens = tokens;
        this.audience = audience;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method)) {
            rejectUnscopedInternalPath(request);
            return true;
        }
        ServiceOnly access = AnnotatedElementUtils.findMergedAnnotation(method.getMethod(), ServiceOnly.class);
        if (access == null) {
            access = AnnotatedElementUtils.findMergedAnnotation(method.getBeanType(), ServiceOnly.class);
        }
        if (access == null) {
            rejectUnscopedInternalPath(request);
            return true;
        }
        String caller = tokens.authenticate(request.getHeader(ServiceTokenService.HEADER), audience,
                access.value(), List.of(access.callers()));
        request.setAttribute(CALLER_ATTRIBUTE, caller);
        return true;
    }

    private static void rejectUnscopedInternalPath(HttpServletRequest request) {
        String path;
        try {
            path = UriUtils.decode(request.getRequestURI(), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException malformedPath) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Service authentication required");
        }
        // Spring parses encoded path and matrix parameters before handler matching.
        for (String segment : path.split("/")) {
            String name = segment.split(";", 2)[0];
            if ("internal".equals(name)) {
                throw new BusinessException(HttpStatus.FORBIDDEN, "Service authentication required");
            }
        }
    }
}
