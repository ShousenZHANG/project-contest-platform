package com.w16a.danish.interaction.service.impl;

import cn.hutool.core.util.StrUtil;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.interaction.domain.dto.SubmissionCommentDTO;
import com.w16a.danish.interaction.domain.po.SubmissionComments;
import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.interaction.domain.vo.SubmissionCommentVO;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.interaction.feign.RegistrationServiceClient;
import com.w16a.danish.interaction.feign.UserServiceClient;
import com.w16a.danish.interaction.mapper.SubmissionCommentsMapper;
import com.w16a.danish.interaction.service.ISubmissionCommentsService;
import com.w16a.danish.interaction.service.PublicSubmissionAccess;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;

/**
 *
 * SubmissionCommentsServiceImpl
 *
 * @author Eddy ZHANG
 * @date 2025/04/08
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubmissionCommentsServiceImpl extends ServiceImpl<SubmissionCommentsMapper, SubmissionComments> implements ISubmissionCommentsService {

    private final RegistrationServiceClient registrationServiceClient;
    private final UserServiceClient userServiceClient;
    private final PublicSubmissionAccess submissions;

    @Override
    @Transactional
    public void addComment(String userId, SubmissionCommentDTO dto) {
        validateContent(dto);
        submissions.requireVisible(dto.getSubmissionId());
        if (StrUtil.isNotBlank(dto.getParentId())) {
            SubmissionComments parent = getById(dto.getParentId());
            if (parent == null || !Objects.equals(dto.getSubmissionId(), parent.getSubmissionId())) {
                throw new BusinessException(HttpStatus.NOT_FOUND, "Parent comment not found for this submission");
            }
            if (parent.getParentId() != null) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Replies must reference a top-level comment");
            }
        }
        SubmissionComments comment = new SubmissionComments()
                .setId(StrUtil.uuid())
                .setSubmissionId(dto.getSubmissionId())
                .setUserId(userId)
                .setParentId(StrUtil.isBlank(dto.getParentId()) ? null : dto.getParentId())
                .setContent(dto.getContent());

        boolean saved = this.save(comment);
        if (!saved) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save comment");
        }
    }

    @Override
    @Transactional
    public void deleteComment(String commentId, RequestContext ctx) {
        SubmissionComments comment = this.getById(commentId);
        if (comment == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Comment not found");
        }

        submissions.requireVisible(comment.getSubmissionId());

        boolean isAdmin = ctx.isAdmin();
        boolean isOwner = ctx.userId().equals(comment.getUserId());
        boolean isOrganizer = false;

        if (!isAdmin && !isOwner) {
            isOrganizer = Boolean.TRUE.equals(registrationServiceClient.isUserOrganizerOfSubmission(
                    comment.getSubmissionId(), ctx.userId()));
        }

        if (!(isAdmin || isOwner || isOrganizer)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You do not have permission to delete this comment");
        }

        boolean removed = this.removeById(commentId);
        if (!removed) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete comment");
        }
    }

    @Override
    public PageResponse<SubmissionCommentVO> getPaginatedComments(String submissionId, int page, int size, String sortBy, String order) {
        submissions.requireVisible(submissionId);
        if (page < 1 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Page must be positive and size must be between 1 and 100");
        }
        if (!"createdAt".equalsIgnoreCase(sortBy) && !"updatedAt".equalsIgnoreCase(sortBy)) {
            sortBy = "createdAt";
        }
        boolean isAsc = "asc".equalsIgnoreCase(order);

        IPage<SubmissionComments> mpPage = new Page<>(page, size);
        mpPage = this.lambdaQuery()
                .eq(SubmissionComments::getSubmissionId, submissionId)
                .isNull(SubmissionComments::getParentId)
                .orderBy(true, isAsc, "createdAt".equalsIgnoreCase(sortBy) ? SubmissionComments::getCreatedAt : SubmissionComments::getUpdatedAt)
                .page(mpPage);

        long total = mpPage.getTotal();
        List<SubmissionComments> paged = mpPage.getRecords();

        List<SubmissionComments> childComments = Collections.emptyList();
        List<String> parentIds = paged.stream().map(SubmissionComments::getId).toList();
        if (!parentIds.isEmpty()) {
            childComments = this.lambdaQuery()
                    .eq(SubmissionComments::getSubmissionId, submissionId)
                    .in(SubmissionComments::getParentId, parentIds)
                    .orderByAsc(SubmissionComments::getCreatedAt)
                    .list();
        }

        Set<String> allUserIds = new HashSet<>();
        paged.forEach(c -> allUserIds.add(c.getUserId()));
        childComments.forEach(c -> allUserIds.add(c.getUserId()));

        Map<String, UserBriefVO> userMap = new HashMap<>();
        List<String> userIds = new ArrayList<>(allUserIds);
        for (int start = 0; start < userIds.size(); start += 100) {
            var reply = userServiceClient.getUsersByIds(userIds.subList(start, Math.min(start + 100, userIds.size())), null);
            if (reply == null || !reply.getStatusCode().is2xxSuccessful() || reply.getBody() == null) {
                throw new com.w16a.danish.common.exception.ServiceUnavailableException("user-service", "getUsersByIds");
            }
            List<UserBriefVO> users = reply.getBody();
            users.forEach(user -> userMap.putIfAbsent(user.getId(), user));
        }

        Map<String, List<SubmissionCommentVO>> groupedReplies = childComments.stream()
                .map(c -> {
                    SubmissionCommentVO vo = new SubmissionCommentVO();
                    vo.setId(c.getId());
                    vo.setSubmissionId(c.getSubmissionId());
                    vo.setParentId(c.getParentId());
                    vo.setContent(c.getContent());
                    vo.setUserId(c.getUserId());
                    vo.setCreatedAt(c.getCreatedAt());
                    vo.setUpdatedAt(c.getUpdatedAt());
                    UserBriefVO user = userMap.get(c.getUserId());
                    if (user != null) {
                        vo.setUserName(user.getName());
                        vo.setAvatarUrl(user.getAvatarUrl());
                    }
                    return vo;
                }).collect(Collectors.groupingBy(SubmissionCommentVO::getParentId));

        List<SubmissionCommentVO> result = paged.stream().map(c -> {
            SubmissionCommentVO vo = new SubmissionCommentVO();
            vo.setId(c.getId());
            vo.setSubmissionId(c.getSubmissionId());
            vo.setParentId(c.getParentId());
            vo.setContent(c.getContent());
            vo.setUserId(c.getUserId());
            vo.setCreatedAt(c.getCreatedAt());
            vo.setUpdatedAt(c.getUpdatedAt());
            UserBriefVO user = userMap.get(c.getUserId());
            if (user != null) {
                vo.setUserName(user.getName());
                vo.setAvatarUrl(user.getAvatarUrl());
            }
            vo.setReplies(groupedReplies.getOrDefault(c.getId(), List.of()));
            return vo;
        }).toList();

        return new PageResponse<>(result, (int) total, page, size, (int) mpPage.getPages());
    }

    @Override
    @Transactional
    public void updateComment(String commentId, String userId, SubmissionCommentDTO dto) {
        SubmissionComments comment = this.getById(commentId);
        if (comment == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Comment not found");
        }

        submissions.requireVisible(comment.getSubmissionId());
        if (!comment.getUserId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You can only edit your own comments");
        }

        validateContent(dto);
        if (StrUtil.isNotBlank(dto.getSubmissionId()) && !Objects.equals(dto.getSubmissionId(), comment.getSubmissionId())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "A comment cannot be moved to another submission");
        }

        comment.setContent(dto.getContent());
        comment.setUpdatedAt(LocalDateTime.now());

        boolean updated = this.updateById(comment);
        if (!updated) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update comment");
        }
    }

    @Override
    public long countComments(String submissionId) {
        if (StrUtil.isBlank(submissionId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Submission ID must not be blank");
        }

        submissions.requireVisible(submissionId);
        return this.lambdaQuery()
                .eq(SubmissionComments::getSubmissionId, submissionId)
                .count();
    }

    @Override
    public Long countAllComments() {
        return baseMapper.countPublicComments();
    }

    @Override
    public long countCompetitionComments(String competitionId) {
        if (StrUtil.isBlank(competitionId)) throw new BusinessException(HttpStatus.BAD_REQUEST, "Competition ID must not be blank");
        return baseMapper.countCompetitionComments(competitionId);
    }

    private static void validateContent(SubmissionCommentDTO dto) {
        if (dto == null || StrUtil.isBlank(dto.getContent())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Comment content must not be blank");
        }
    }

}
