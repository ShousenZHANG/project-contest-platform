package com.w16a.danish.interaction.controller;

import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.interaction.domain.dto.SubmissionCommentDTO;
import com.w16a.danish.interaction.service.ISubmissionCommentsService;
import com.w16a.danish.interaction.service.ISubmissionVotesService;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class InteractionRoleGuardTest {
    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "ORGANIZER", "JUDGE"})
    void elevatedRolesDoNotAcquireParticipantVotingAndCommentingPrivileges(String role) {
        var comments = mock(ISubmissionCommentsService.class);
        var votes = mock(ISubmissionVotesService.class);
        var controller = new SubmissionInteractionController(comments, votes);
        var user = new RequestContext("u1", role);
        var dto = new SubmissionCommentDTO();
        dto.setContent("Comment");
        dto.setSubmissionId("s1");
        assertForbidden(() -> controller.postComment(dto, user));
        assertForbidden(() -> controller.updateComment("m1", user, dto));
        assertForbidden(() -> controller.vote("s1", user));
        assertForbidden(() -> controller.unvote("s1", user));
        verifyNoInteractions(comments, votes);
    }

    private static void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOfSatisfying(BusinessException.class,
                error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }
}
