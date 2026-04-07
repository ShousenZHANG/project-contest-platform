package com.w16a.danish.common.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.time.ZoneId;
import java.util.TimeZone;

/**
 * Sets the JVM default timezone at startup.
 * Shared across all services via common-lib.
 *
 * @author Eddy ZHANG
 */
@Configuration
public class TimeZoneConfig {

    @PostConstruct
    public void setDefaultTimeZone() {
        TimeZone.setDefault(TimeZone.getTimeZone(ZoneId.of("Australia/Sydney")));
    }
}
