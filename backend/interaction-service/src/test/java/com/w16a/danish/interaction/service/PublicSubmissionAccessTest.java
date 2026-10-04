package com.w16a.danish.interaction.service;

import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.common.exception.ServiceUnavailableException;
import com.w16a.danish.interaction.feign.RegistrationServiceClient;
import com.w16a.danish.interaction.feign.fallback.RegistrationServiceClientFallback;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class PublicSubmissionAccessTest {
    @Test
    void privatePendingRejectedAndMissingSubmissionsAreIndistinguishableToPublicInteractions() {
        var client = mock(RegistrationServiceClient.class);
        var access = new PublicSubmissionAccess(client);
        for (String id : new String[]{"private", "pending", "rejected", "missing"}) {
            when(client.isPublicApproved(id)).thenReturn(false);
            assertThatThrownBy(() -> access.requireVisible(id)).isInstanceOfSatisfying(BusinessException.class,
                    error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        }
        when(client.isPublicApproved("approved-public")).thenReturn(true);
        assertThatCode(() -> access.requireVisible("approved-public")).doesNotThrowAnyException();
        assertThatThrownBy(() -> access.requireVisible("unknown-null")).isInstanceOf(BusinessException.class);
    }

    @Test
    void blankIdsAreRejectedWithoutCallingRegistrationAndAnOutageCannotOpenAccess() {
        var client = mock(RegistrationServiceClient.class);
        var access = new PublicSubmissionAccess(client);
        assertThatThrownBy(() -> access.requireVisible(" ")).isInstanceOfSatisfying(BusinessException.class,
                error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verifyNoInteractions(client);
        assertThatThrownBy(() -> new PublicSubmissionAccess(new RegistrationServiceClientFallback()).requireVisible("s1"))
                .isInstanceOf(ServiceUnavailableException.class);
    }
}
