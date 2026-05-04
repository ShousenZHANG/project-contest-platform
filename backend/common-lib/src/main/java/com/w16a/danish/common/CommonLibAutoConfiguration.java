package com.w16a.danish.common;

import com.w16a.danish.common.config.MyMetaObjectHandler;
import com.w16a.danish.common.config.TimeZoneConfig;
import com.w16a.danish.common.context.WebMvcContextConfig;
import com.w16a.danish.common.exception.GlobalExceptionHandler;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Import;

/**
 * Spring Boot Auto-configuration for common-lib.
 * Automatically registers shared beans (exception handler, meta handler, timezone,
 * and the MVC identity-context resolver) in all services that declare common-lib
 * as a dependency.
 *
 * Registered via:
 * META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
 *
 * @author Eddy ZHANG
 */
@AutoConfiguration
@Import({
        GlobalExceptionHandler.class,
        MyMetaObjectHandler.class,
        TimeZoneConfig.class,
        WebMvcContextConfig.class
})
public class CommonLibAutoConfiguration {
    // All beans are registered via the @Import and class-level @Component annotations
}
