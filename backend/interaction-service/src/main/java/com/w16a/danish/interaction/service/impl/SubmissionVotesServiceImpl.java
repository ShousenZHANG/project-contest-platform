package com.w16a.danish.interaction.service.impl;

import cn.hutool.core.util.StrUtil;
import com.w16a.danish.interaction.domain.po.SubmissionVotes;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.interaction.mapper.SubmissionVotesMapper;
import com.w16a.danish.interaction.service.ISubmissionVotesService;
import com.w16a.danish.interaction.service.PublicSubmissionAccess;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DuplicateKeyException;
import lombok.extern.slf4j.Slf4j;

/**
 *
 * SubmissionVotesServiceImpl
 *
 * @author Eddy ZHANG
 * @date 2025/04/08
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubmissionVotesServiceImpl extends ServiceImpl<SubmissionVotesMapper, SubmissionVotes> implements ISubmissionVotesService {

    private final PublicSubmissionAccess submissions;

    @Override
    @Transactional
    public void vote(String submissionId, String userId) {
        if (StrUtil.isBlank(submissionId) || StrUtil.isBlank(userId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Submission ID or User ID cannot be empty");
        }

        submissions.requireVisible(submissionId);
        boolean alreadyVoted = this.lambdaQuery()
                .eq(SubmissionVotes::getSubmissionId, submissionId)
                .eq(SubmissionVotes::getUserId, userId)
                .exists();

        if (alreadyVoted) {
            throw new BusinessException(HttpStatus.CONFLICT, "You have already voted for this submission");
        }

        SubmissionVotes vote = new SubmissionVotes()
                .setId(StrUtil.uuid())
                .setSubmissionId(submissionId)
                .setUserId(userId);

        boolean saved;
        try {
            saved = this.save(vote);
        } catch (DuplicateKeyException duplicate) {
            throw new BusinessException(HttpStatus.CONFLICT, "You have already voted for this submission");
        }
        if (!saved) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save vote");
        }
    }

    @Override
    @Transactional
    public void unvote(String submissionId, String userId) {
        if (StrUtil.isBlank(submissionId) || StrUtil.isBlank(userId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Submission ID or User ID cannot be empty");
        }

        submissions.requireVisible(submissionId);
        boolean exists = this.lambdaQuery()
                .eq(SubmissionVotes::getSubmissionId, submissionId)
                .eq(SubmissionVotes::getUserId, userId)
                .exists();

        if (!exists) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "You have not voted for this submission");
        }

        boolean removed = this.lambdaUpdate()
                .eq(SubmissionVotes::getSubmissionId, submissionId)
                .eq(SubmissionVotes::getUserId, userId)
                .remove();

        if (!removed) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to remove vote");
        }
    }

    @Override
    public long countVotes(String submissionId) {
        if (StrUtil.isBlank(submissionId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Submission ID cannot be empty");
        }

        submissions.requireVisible(submissionId);
        return this.lambdaQuery()
                .eq(SubmissionVotes::getSubmissionId, submissionId)
                .count();
    }

    @Override
    public boolean hasVoted(String submissionId, String userId) {
        if (StrUtil.isBlank(submissionId) || StrUtil.isBlank(userId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Submission ID and User ID cannot be empty");
        }

        submissions.requireVisible(submissionId);
        return this.lambdaQuery()
                .eq(SubmissionVotes::getSubmissionId, submissionId)
                .eq(SubmissionVotes::getUserId, userId)
                .exists();
    }

    @Override
    public Long countAllVotes() {
        return baseMapper.countPublicVotes();
    }

    @Override
    public long countCompetitionVotes(String competitionId) {
        if (StrUtil.isBlank(competitionId)) throw new BusinessException(HttpStatus.BAD_REQUEST, "Competition ID must not be blank");
        return baseMapper.countCompetitionVotes(competitionId);
    }

}
