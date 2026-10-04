package com.w16a.danish.user.domain.dto;

import lombok.Data;

/** Provider-verified email metadata; profile email alone does not prove ownership. */
@Data
public class GithubEmailDTO {
    private String email;
    private boolean primary;
    private boolean verified;
}
