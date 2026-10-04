package com.w16a.danish.user.feign;

import com.w16a.danish.user.domain.dto.GoogleUserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * @author Eddy ZHANG
 * @date 2025/03/26
 * @description Google User Client
 */
@FeignClient(
        name = "googleUserClient",
        url = "https://openidconnect.googleapis.com",
        configuration = GoogleFeignConfig.class
)
public interface GoogleUserClient {

    @GetMapping("/v1/userinfo")
    GoogleUserDTO getUserInfo(@RequestHeader("Authorization") String bearerToken);
}
