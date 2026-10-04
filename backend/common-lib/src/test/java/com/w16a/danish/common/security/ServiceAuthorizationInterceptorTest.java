package com.w16a.danish.common.security;

import com.w16a.danish.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ServiceAuthorizationInterceptorTest {
    private final ServiceTokenService tokens = new ServiceTokenService("separate-service-signing-key-at-least-32", "browser-key");
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new Endpoints(), new ScopedEndpoints()).setControllerAdvice(new GlobalExceptionHandler())
                .addInterceptors(new ServiceAuthorizationInterceptor(tokens, "registration-service")).build();
    }

    @RestController
    @ServiceOnly(value = "internal:read", callers = "judge-service")
    static class ScopedEndpoints {
        @GetMapping("/internal/class-scoped")
        public String scoped() { return "trusted class"; }
    }

    @RestController
    static class Endpoints {
        @GetMapping("/submissions/internal/scored")
        @ServiceOnly(value = "internal:read", callers = "judge-service")
        public String scored() { return "trusted"; }

        @GetMapping("/submissions/internal/unannotated")
        public String unannotated() { return "must stay closed"; }

        @GetMapping("/submissions/public/approved")
        public String approved() { return "public"; }
    }

    @Test
    void scopedServiceRequestCrossesTheActualMvcHandler() throws Exception {
        mvc.perform(get("/submissions/internal/scored").header(ServiceTokenService.HEADER,
                        tokens.issue("judge-service", "registration-service", "internal:read")))
                .andExpect(status().isOk()).andExpect(content().string("trusted"));
    }

    @Test
    void spoofedBrowserIdentityAndReadScopeFromAnotherCallerAreDenied() throws Exception {
        mvc.perform(get("/submissions/internal/scored").header("User-ID", "admin").header("User-Role", "ADMIN"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/submissions/internal/scored").header(ServiceTokenService.HEADER,
                        tokens.issue("user-service", "registration-service", "internal:read")))
                .andExpect(status().isForbidden());
    }

    @Test
    void unannotatedInternalOperationFailsClosedAndPublicLookupStillWorks() throws Exception {
        mvc.perform(get("/submissions/internal/unannotated").header(ServiceTokenService.HEADER,
                        tokens.issue("judge-service", "registration-service", "internal:read")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/submissions/public/approved")).andExpect(status().isOk()).andExpect(content().string("public"));
    }

    @Test
    void classScopedHandlerRequiresTheSameCredential() throws Exception {
        mvc.perform(get("/internal/class-scoped")).andExpect(status().isForbidden());
        mvc.perform(get("/internal/class-scoped").header(ServiceTokenService.HEADER,
                        tokens.issue("judge-service", "registration-service", "internal:read")))
                .andExpect(status().isOk()).andExpect(content().string("trusted class"));
    }

    @Test
    void nonControllerHandlerDoesNotInventServiceAccessRequirements() {
        org.assertj.core.api.Assertions.assertThat(new ServiceAuthorizationInterceptor(tokens, "registration-service")
                .preHandle(new org.springframework.mock.web.MockHttpServletRequest(),
                        new org.springframework.mock.web.MockHttpServletResponse(), new Object())).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/submissions/internal;mode=public/file", "/submissions/intern%61l/file", "/submissions/%69nternal", "/internal/asset.js"})
    void alternateInternalPathAndNonControllerResourcesFailClosed(String path) throws Exception {
        var request = new org.springframework.mock.web.MockHttpServletRequest(); request.setRequestURI(path);
        var interceptor = new ServiceAuthorizationInterceptor(tokens, "registration-service");
        var response = new org.springframework.mock.web.MockHttpServletResponse();
        var method = new org.springframework.web.method.HandlerMethod(new Endpoints(), Endpoints.class.getDeclaredMethod("unannotated"));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> interceptor.preHandle(request, response, method))
                .isInstanceOf(com.w16a.danish.common.exception.BusinessException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> interceptor.preHandle(request, response, new Object()))
                .isInstanceOf(com.w16a.danish.common.exception.BusinessException.class);
    }
}
