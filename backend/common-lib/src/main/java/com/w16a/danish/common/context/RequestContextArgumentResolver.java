package com.w16a.danish.common.context;

import com.w16a.danish.common.exception.BusinessException;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Resolves {@link CurrentUser}-annotated {@link RequestContext} parameters in
 * Spring MVC controllers.
 *
 * <p>Reads the {@code User-ID} and {@code User-Role} headers injected by the
 * API gateway's {@code JwtAuthFilter} and constructs a {@link RequestContext}.
 *
 * <p>Registered automatically via {@link WebMvcContextConfig}.
 *
 * @author Eddy ZHANG
 */
public class RequestContextArgumentResolver implements HandlerMethodArgumentResolver {

    private static final String HEADER_USER_ID = "User-ID";
    private static final String HEADER_USER_ROLE = "User-Role";

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class)
                && RequestContext.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parameter,
                                  ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest,
                                  WebDataBinderFactory binderFactory) {
        String userId = webRequest.getHeader(HEADER_USER_ID);
        String role = webRequest.getHeader(HEADER_USER_ROLE);

        if (userId == null || userId.isBlank() || role == null || role.isBlank()) {
            throw new BusinessException(
                    HttpStatus.UNAUTHORIZED,
                    "Missing identity context - ensure the request is routed through the API gateway"
            );
        }

        return new RequestContext(userId.strip(), role.strip());
    }
}
