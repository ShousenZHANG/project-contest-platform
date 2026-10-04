package com.w16a.danish.common.security;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ServiceSecurityAutoConfiguration {
    @Bean
    public ServiceTokenService serviceTokenService(Environment environment) {
        return new ServiceTokenService(environment.getProperty("service.auth.secret",
                environment.getProperty("SERVICE_JWT_SECRET", "")), environment.getProperty("jwt.secret", ""));
    }

    @Bean
    public WebMvcConfigurer serviceAuthorizationMvcConfigurer(ServiceTokenService tokens, Environment environment) {
        ServiceAuthorizationInterceptor interceptor = new ServiceAuthorizationInterceptor(tokens,
                environment.getProperty("spring.application.name", "unknown-service"));
        return new WebMvcConfigurer() {
            @Override
            public void addInterceptors(InterceptorRegistry registry) {
                registry.addInterceptor(interceptor).order(-100);
            }
        };
    }
}
