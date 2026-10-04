package com.w16a.danish.registration.controller;

import com.w16a.danish.common.context.CurrentUser;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.domain.vo.TeamSubmissionInfoVO;
import com.w16a.danish.registration.service.ISubmissionRecordsService;
import com.w16a.danish.registration.service.SubmissionDownloads;
import com.w16a.danish.registration.service.SubmissionScores;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/submissions")
@RequiredArgsConstructor
public class TeamSubmissionDetailController {
    private final ISubmissionRecordsService submissions;
    private final SubmissionDownloads downloads;
    private final SubmissionScores scores;
    @GetMapping("/teams/{competitionId}/{teamId}")
    public ResponseEntity<TeamSubmissionInfoVO> getTeamSubmission(@PathVariable String competitionId,
            @PathVariable String teamId, @CurrentUser RequestContext user) {
        var record = submissions.lambdaQuery().eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getTeamId, teamId).one();
        if (record == null) throw new BusinessException(HttpStatus.NOT_FOUND, "Submission not found");
        downloads.requireAccessible(record.getId(), user);
        TeamSubmissionInfoVO view = new TeamSubmissionInfoVO();
        BeanUtils.copyProperties(record, view);
        view.setSubmissionId(record.getId());
        view.setFileUrl("/submissions/" + record.getId() + "/download");
        var score = scores.visibleScore(record);
        view.setTotalScore(score == null ? null : score.doubleValue());
        return ResponseEntity.ok(view);
    }
}
