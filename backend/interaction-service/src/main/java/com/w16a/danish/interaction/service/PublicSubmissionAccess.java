package com.w16a.danish.interaction.service;

import cn.hutool.core.util.StrUtil;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.interaction.feign.RegistrationServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Public interactions follow the registration domain's current visibility decision. */
@Component
@RequiredArgsConstructor
public class PublicSubmissionAccess {
    private final RegistrationServiceClient submissions;

    public void requireVisible(String submissionId) {
        if (StrUtil.isBlank(submissionId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Submission ID must not be blank");
        }
        if (!Boolean.TRUE.equals(submissions.isPublicApproved(submissionId))) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Submission not found");
        }
    }
}
