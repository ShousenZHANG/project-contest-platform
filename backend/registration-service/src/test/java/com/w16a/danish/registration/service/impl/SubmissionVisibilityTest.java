package com.w16a.danish.registration.service.impl;

import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.feign.FileServiceClient;
import com.w16a.danish.registration.feign.UserServiceClient;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.notify.SubmissionNotifier;
import com.w16a.danish.registration.notify.UploadRollbackCleanup;
import com.w16a.danish.registration.service.SubmissionScores;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class SubmissionVisibilityTest {
    @Test
    void interactionVisibilityRequiresBothApprovalAndAPublicCompetition() {
        var competitions = mock(CompetitionGateway.class);
        var service = spy(new SubmissionRecordsServiceImpl(competitions, mock(FileServiceClient.class),
                mock(SubmissionNotifier.class), mock(UserServiceClient.class), mock(SubmissionScores.class),
                mock(com.w16a.danish.common.recovery.DurableTasks.class), mock(UploadRollbackCleanup.class)));
        var competition = new CompetitionResponseVO();
        when(competitions.require("c1")).thenReturn(competition);
        var submission = new SubmissionRecords().setId("s1").setCompetitionId("c1").setReviewStatus("APPROVED");
        doReturn(submission).when(service).getById("s1");
        assertThat(service.isPublicApproved("s1")).isFalse();
        competition.setIsPublic(false);
        assertThat(service.isPublicApproved("s1")).isFalse();
        competition.setIsPublic(true);
        assertThat(service.isPublicApproved("s1")).isTrue();
        clearInvocations(competitions);
        for (String status : new String[]{"PENDING", "REJECTED"}) {
            submission.setReviewStatus(status);
            assertThat(service.isPublicApproved("s1")).isFalse();
        }
        doReturn(null).when(service).getById("missing");
        assertThat(service.isPublicApproved("missing")).isFalse();
        verifyNoInteractions(competitions);
    }
}
