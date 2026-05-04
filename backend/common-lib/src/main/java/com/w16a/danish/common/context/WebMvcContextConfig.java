package com.w16a.danish.common.context;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * Registers {@link RequestContextArgumentResolver} with Spring MVC so that
 * {@link CurrentUser}-annotated parameters are resolved in all controllers
 * across every servlet-based microservice that depends on common-lib.
 *
 * <p>The {@link ConditionalOnWebApplication} guard ensures this config is
 * skipped in the reactive API gateway (WebFlux).
 *
 * @author Eddy ZHANG
 */
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class WebMvcContextConfig implements WebMvcConfigurer {

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new RequestContextArgumentResolver());
    }
}
