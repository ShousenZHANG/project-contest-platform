package com.w16a.danish.common.context;

import com.w16a.danish.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.web.context.request.NativeWebRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * This resolver turns the gateway's {@code User-ID} / {@code User-Role} headers into the identity
 * every controller authorises against. If it ever resolved a partial context, downstream role
 * checks would run against a null role and quietly deny — or worse, allow — the wrong thing.
 */
class RequestContextArgumentResolverTest {

    private final RequestContextArgumentResolver resolver = new RequestContextArgumentResolver();

    @Test
    @DisplayName("Resolves only parameters that are both annotated and of the right type")
    void supportsOnlyAnnotatedRequestContexts() throws NoSuchMethodException {
        assertThat(resolver.supportsParameter(parameterOf("annotatedContext"))).isTrue();
        assertThat(resolver.supportsParameter(parameterOf("bareContext"))).isFalse();
        assertThat(resolver.supportsParameter(parameterOf("annotatedString"))).isFalse();
    }

    @Test
    @DisplayName("Both headers present yields the identity, with surrounding whitespace stripped")
    void resolvesIdentityFromHeaders() throws Exception {
        NativeWebRequest request = requestWith("  u-123  ", " ORGANIZER ");

        RequestContext ctx = (RequestContext) resolver.resolveArgument(null, null, request, null);

        assertThat(ctx.userId()).isEqualTo("u-123");
        assertThat(ctx.role()).isEqualTo("ORGANIZER");
        assertThat(ctx.isOrganizer()).isTrue();
    }

    @ParameterizedTest(name = "userId={0} role={1} is rejected")
    @CsvSource(nullValues = "null", value = {
            "null,  ORGANIZER",
            "u-123, null",
            "'',    ORGANIZER",
            "u-123, ''",
            "'   ', ORGANIZER",
            "u-123, '   '",
    })
    @DisplayName("A missing or blank half of the identity is 401 — never a half-built context")
    void rejectsIncompleteIdentity(String userId, String role) {
        NativeWebRequest request = requestWith(userId, role);

        assertThatThrownBy(() -> resolver.resolveArgument(null, null, request, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("API gateway")
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private static NativeWebRequest requestWith(String userId, String role) {
        NativeWebRequest request = mock(NativeWebRequest.class);
        when(request.getHeader("User-ID")).thenReturn(userId);
        when(request.getHeader("User-Role")).thenReturn(role);
        return request;
    }

    private MethodParameter parameterOf(String methodName) throws NoSuchMethodException {
        return new MethodParameter(Endpoints.class.getDeclaredMethod(methodName, methodParamType(methodName)), 0);
    }

    private static Class<?> methodParamType(String methodName) {
        return methodName.equals("annotatedString") ? String.class : RequestContext.class;
    }

    /** Stand-ins for the three parameter shapes a controller can declare. */
    @SuppressWarnings("unused")
    static class Endpoints {
        void annotatedContext(@CurrentUser RequestContext ctx) {}
        void bareContext(RequestContext ctx) {}
        void annotatedString(@CurrentUser String userId) {}
    }
}
