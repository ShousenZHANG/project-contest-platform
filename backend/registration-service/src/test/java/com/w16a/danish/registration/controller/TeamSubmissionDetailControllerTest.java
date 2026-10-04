package com.w16a.danish.registration.controller;

import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.service.ISubmissionRecordsService;
import com.w16a.danish.registration.service.SubmissionDownloads;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TeamSubmissionDetailControllerTest {
    private ISubmissionRecordsService submissions;
    private SubmissionDownloads downloads;
    private TeamSubmissionDetailController controller;
    private LambdaQueryChainWrapper<SubmissionRecords> query;
    private static final RequestContext MEMBER = new RequestContext("u1", "PARTICIPANT");

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        submissions = mock(ISubmissionRecordsService.class);
        downloads = mock(SubmissionDownloads.class);
        controller = new TeamSubmissionDetailController(submissions, downloads,
                new com.w16a.danish.registration.service.SubmissionScores(mock(com.w16a.danish.registration.mapper.SubmissionRecordsMapper.class)));
        query = mock(LambdaQueryChainWrapper.class);
        when(submissions.lambdaQuery()).thenReturn(query);
        when(query.eq(any(), any())).thenReturn(query);
    }

    @Test
    void ownerViewUsesTheDomainAclAndAnAuthenticatedApplicationDownloadUrl() {
        var record = new SubmissionRecords().setId("s1").setTeamId("t1").setCompetitionId("c1")
                .setFileUrl("http://minio:9000/submissions/private.pdf").setTitle("Team work")
                .setReviewStatus("PENDING").setTotalScore(new BigDecimal("8.75"));
        when(query.one()).thenReturn(record);
        when(downloads.requireAccessible("s1", MEMBER)).thenReturn(record);
        var view = controller.getTeamSubmission("c1", "t1", MEMBER).getBody();
        assertThat(view.getSubmissionId()).isEqualTo("s1");
        assertThat(view.getFileUrl()).isEqualTo("/submissions/s1/download");
        assertThat(view.getReviewStatus()).isEqualTo("PENDING");
        assertThat(view.getTotalScore()).isNull();
        verify(downloads).requireAccessible("s1", MEMBER);
    }

    @Test
    void unassignedRoleCannotUseTeamDetailToReadPrivateSubmissionMetadata() {
        when(query.one()).thenReturn(new SubmissionRecords().setId("s1"));
        when(downloads.requireAccessible("s1", MEMBER)).thenThrow(new BusinessException(HttpStatus.FORBIDDEN, "You cannot download this submission"));
        assertThatThrownBy(() -> controller.getTeamSubmission("c1", "t1", MEMBER))
                .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void missingTeamSubmissionIs404WithoutCallingFileOrAclServices() {
        assertThatThrownBy(() -> controller.getTeamSubmission("c1", "t1", MEMBER))
                .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(downloads);
    }
}
