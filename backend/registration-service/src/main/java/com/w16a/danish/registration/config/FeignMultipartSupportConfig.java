package com.w16a.danish.registration.config;

import feign.codec.Encoder;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cloud.openfeign.support.FeignHttpMessageConverters;
import org.springframework.cloud.openfeign.support.SpringEncoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 *
 * FeignMultipartSupportConfig
 *
 * @author Eddy ZHANG
 * @date 2025/03/28
 */
@Configuration
public class FeignMultipartSupportConfig {
    @Bean
    public Encoder feignFormEncoder(ObjectProvider<FeignHttpMessageConverters> converters) {
        return new SpringEncoder(converters);
    }
}
