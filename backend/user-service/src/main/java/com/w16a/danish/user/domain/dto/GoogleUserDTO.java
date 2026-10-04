package com.w16a.danish.user.domain.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * @author Eddy ZHANG
 * @date 2025/03/26
 * @description Google User DTO
 */
@Data
@Schema(name = "GoogleUserDTO", description = "Google user DTO")
public class GoogleUserDTO {
    private String sub;

    @Schema(description = "Google user email")
    private String email;
    @Schema(description = "Google user name")
    private String name;

    @JsonProperty("email_verified")
    private Boolean emailVerified;
}
