package com.w16a.danish.registration.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.registration.notify.SubmissionNotifier;
import com.w16a.danish.registration.domain.dto.SubmissionReviewDTO;
import com.w16a.danish.common.messaging.message.SubmissionReviewedMessage;
import com.w16a.danish.common.messaging.message.SubmissionUploadedMessage;
import com.w16a.danish.registration.domain.po.CompetitionOrganizers;
import com.w16a.danish.registration.domain.po.CompetitionParticipants;
import com.w16a.danish.registration.domain.po.CompetitionTeams;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.registration.domain.vo.*;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.feign.FileServiceClient;
import com.w16a.danish.registration.feign.UserServiceClient;
import com.w16a.danish.registration.mapper.SubmissionRecordsMapper;
import com.w16a.danish.registration.service.ICompetitionOrganizersService;
import com.w16a.danish.registration.service.ICompetitionParticipantsService;
import com.w16a.danish.registration.service.ISubmissionRecordsService;
import com.w16a.danish.registration.service.ICompetitionTeamsService;
import com.w16a.danish.registration.service.SubmissionScores;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;

/**
 *
 * This class handles the management of submission records.
 *
 * @author Eddy ZHANG
 * @date 2025/04/03
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubmissionRecordsServiceImpl extends ServiceImpl<SubmissionRecordsMapper, SubmissionRecords> implements ISubmissionRecordsService {

    private final CompetitionGateway competitionGateway;
    private final FileServiceClient fileServiceClient;
    private final SubmissionNotifier submissionNotifier;
    private final UserServiceClient userServiceClient;
    private final SubmissionScores scores;

    private final com.w16a.danish.common.recovery.DurableTasks tasks;
    private final com.w16a.danish.registration.notify.UploadRollbackCleanup rollbackCleanup;

    @Lazy
    @Autowired
    private ICompetitionParticipantsService competitionParticipantsService;

    @Lazy
    @Autowired
    private ICompetitionOrganizersService competitionOrganizersService;

    @Lazy
    @Autowired
    private ICompetitionTeamsService competitionTeamsService;

    @Override
    public boolean isPublicApproved(String submissionId) {
        if (StrUtil.isBlank(submissionId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Submission ID must not be blank");
        }
        SubmissionRecords record = getById(submissionId);
        if (record == null || !"APPROVED".equals(record.getReviewStatus())) return false;
        return Boolean.TRUE.equals(competitionGateway.require(record.getCompetitionId()).getIsPublic());
    }

    @Override
    public Map<String, Boolean> getSubmissionStatus(String userId, List<String> competitionIds) {
        if (competitionIds == null || competitionIds.isEmpty()) {
            return Map.of();
        }

        List<SubmissionRecords> records = this.lambdaQuery()
                .eq(SubmissionRecords::getUserId, userId)
                .in(SubmissionRecords::getCompetitionId, competitionIds)
                .list();

        return records.stream()
                .collect(Collectors.toMap(
                        SubmissionRecords::getCompetitionId,
                        r -> true,
                        (existing, replacement) -> existing
                ));
    }

    @Override
    public Map<String, BigDecimal> getSubmissionScores(String userId, List<String> competitionIds) {
        if (competitionIds == null || competitionIds.isEmpty()) {
            return Map.of();
        }

        List<SubmissionRecords> records = this.lambdaQuery()
                .eq(SubmissionRecords::getUserId, userId)
                .in(SubmissionRecords::getCompetitionId, competitionIds)
                .list();

        Map<String, BigDecimal> visible = scores.visibleScores(records);
        return records.stream()
                .filter(r -> visible.containsKey(r.getId()))
                .collect(Collectors.toMap(
                        SubmissionRecords::getCompetitionId,
                        r -> visible.get(r.getId()),
                        (existing, replacement) -> existing
                ));
    }

    @Override
    @Transactional
    public void deleteSubmissionsByUserAndCompetition(String userId, String competitionId) {
        lockDeletableSubmissions(competitionId);
        SubmissionRecords submission = baseMapper.lockOwnedSubmission(competitionId, userId, null);

        if (submission != null) {
            deleteFileByUrl(submission.getFileUrl());
            if (!this.removeById(submission.getId())) {
                throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete submission");
            }
        }
    }

    @Override
    @Transactional
    public void deleteSubmissionsByTeamAndCompetition(String teamId, String competitionId) {
        lockDeletableSubmissions(competitionId);
        // The schema allows one Submission per registered Team and Competition.
        var submission = baseMapper.lockOwnedSubmission(competitionId, null, teamId);
        if (submission != null) {
            deleteFileByUrl(submission.getFileUrl());
            if (!removeById(submission.getId())) {
                throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete the team submission.");
            }
        }
    }

    @Override
    @Transactional
    public void submitWork(RequestContext ctx, String competitionId, String title, String description, MultipartFile file) {
        ctx.requireAnyRole("PARTICIPANT");
        String userId = ctx.userId();

        boolean registered = competitionParticipantsService.lambdaQuery()
                .eq(CompetitionParticipants::getUserId, userId)
                .eq(CompetitionParticipants::getCompetitionId, competitionId)
                .exists();
        if (!registered) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You must register before submitting work");
        }

        CompetitionResponseVO competition;
        try {
            competition = competitionGateway.require(competitionId);

            if (competition.getParticipationType() != com.w16a.danish.common.domain.enums.ParticipationType.INDIVIDUAL) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "This competition requires a team submission");
            }
            if (!CompetitionStatus.isSubmittable(competition.getStatus())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Cannot submit work to this competition");
            }

            if (competition.getEndDate() != null && !competition.getEndDate().isAfter(LocalDateTime.now(java.time.ZoneOffset.UTC))) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "The competition has already ended");
            }
        } catch (BusinessException e) {
            // Preserve domain status codes (404/400) instead of masking them as 503.
            throw e;
        } catch (Exception e) {
            log.error("Failed to verify competition {}", competitionId, e);
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Failed to verify competition");
        }

        String uploadedUrl = Optional.ofNullable(fileServiceClient.uploadSubmission(file).getBody())
                .filter(StrUtil::isNotBlank)
                .orElseThrow(() -> new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "File upload failed"));
        rollbackCleanup.watch(com.w16a.danish.registration.service.SubmissionDownloads.objectName(uploadedUrl));

        SubmissionRecords submission = new SubmissionRecords()
                .setUserId(userId)
                .setCompetitionId(competitionId);
        persistUploadedSubmission(submission, title, description, file, uploadedUrl,
                "Failed to update submission", "Failed to save submission");

        UserBriefVO user = userServiceClient.getUserBriefById(userId).getBody();

        if (user == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "User not found");
        }

        SubmissionUploadedMessage message = new SubmissionUploadedMessage();
        message.setUserName(user.getName());
        message.setUserEmail(user.getEmail());
        message.setCompetitionName(competition.getName());
        message.setTitle(title);
        message.setSubmittedAt(LocalDateTime.now());
        submissionNotifier.sendSubmissionUploaded(message);
    }

    @Override
    public SubmissionInfoVO getMySubmission(String competitionId, RequestContext ctx) {
        ctx.requireAnyRole("PARTICIPANT");
        String userId = ctx.userId();

        SubmissionRecords submission = lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getUserId, userId)
                .one();

        if (submission == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "No submission found");
        }

        SubmissionInfoVO vo = new SubmissionInfoVO();
        BeanUtil.copyProperties(submission, vo);
        vo.setTotalScore(scores.visibleScore(submission));
                    vo.setFileUrl("/submissions/" + submission.getId() + "/download");
        return vo;
    }

    @Override
    public PageResponse<SubmissionInfoVO> listSubmissionsByRole(
            String competitionId,
            RequestContext ctx,
            int page,
            int size,
            String keyword,
            String sortBy,
            String order
    ) {
        String userId = ctx.userId();
        boolean isOrganizerOrAdmin = ctx.isAdmin() ||
                competitionOrganizersService.lambdaQuery()
                        .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                        .eq(CompetitionOrganizers::getUserId, userId)
                        .exists();

        if (!isOrganizerOrAdmin) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only organizers or admins can view all submissions");
        }

        boolean asc = !"desc".equalsIgnoreCase(order);
        var query = lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .and(StrUtil.isNotBlank(keyword), w -> w
                        .like(SubmissionRecords::getTitle, keyword)
                        .or()
                        .like(SubmissionRecords::getDescription, keyword));
        switch (sortBy == null ? "" : sortBy) {
            case "title" -> query.orderBy(true, asc, SubmissionRecords::getTitle);
            case "totalScore" -> orderByCurrentScore(query, competitionId, asc);
            default -> query.orderBy(true, asc, SubmissionRecords::getCreatedAt);
        }

        // DB-level pagination (PaginationInnerInterceptor) — avoids loading every
        // submission into the JVM just to slice one page.
        Page<SubmissionRecords> pageResult = new Page<>(page, size);
        query.page(pageResult);

        Map<String, BigDecimal> visible = scores.visibleScores(pageResult.getRecords());
        List<SubmissionInfoVO> vos = pageResult.getRecords().stream()
                .map(submission -> {
                    SubmissionInfoVO vo = new SubmissionInfoVO();
                    BeanUtil.copyProperties(submission, vo);
                    vo.setTotalScore(visible.get(submission.getId()));
                    vo.setFileUrl("/submissions/" + submission.getId() + "/download");
                    return vo;
                })
                .toList();

        return new PageResponse<>(vos, (int) pageResult.getTotal(), page, size, (int) pageResult.getPages());
    }

    @Override
    public PageResponse<SubmissionInfoVO> listPublicApprovedSubmissions(
            String competitionId, int page, int size, String keyword, String sortBy, String order) {
        requirePublicCompetition(competitionId);
        validatePage(page, size);

        boolean asc = !"desc".equalsIgnoreCase(order);
        var query = lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getReviewStatus, "APPROVED")
                .and(StrUtil.isNotBlank(keyword), w -> w
                        .like(SubmissionRecords::getTitle, keyword)
                        .or()
                        .like(SubmissionRecords::getDescription, keyword));
        switch (sortBy == null ? "" : sortBy) {
            case "title" -> query.orderBy(true, asc, SubmissionRecords::getTitle);
            case "totalScore" -> orderByCurrentScore(query, competitionId, asc);
            default -> query.orderBy(true, asc, SubmissionRecords::getCreatedAt);
        }

        // DB-level pagination (PaginationInnerInterceptor) — avoids loading every
        // approved submission into the JVM just to slice one page.
        Page<SubmissionRecords> pageResult = new Page<>(page, size);
        query.page(pageResult);

        Map<String, BigDecimal> visible = scores.visibleScores(pageResult.getRecords());
        List<SubmissionInfoVO> vos = pageResult.getRecords().stream()
                .map(submission -> {
                    SubmissionInfoVO vo = new SubmissionInfoVO();
                    BeanUtil.copyProperties(submission, vo);
                    vo.setTotalScore(visible.get(submission.getId()));
                    vo.setFileUrl("/submissions/public/" + submission.getId() + "/download");
                    vo.setReviewComments(null); vo.setReviewedBy(null); vo.setReviewedAt(null);
                    return vo;
                })
                .toList();

        return new PageResponse<>(vos, (int) pageResult.getTotal(), page, size, (int) pageResult.getPages());
    }

    @Override
    @Transactional
    public void reviewSubmission(SubmissionReviewDTO dto, RequestContext ctx) {
        if (!ctx.isAdmin() && !ctx.isOrganizer()) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to review this submission");
        }
        String reviewerId = ctx.userId();
        SubmissionRecords submission = this.getById(dto.getSubmissionId());
        if (submission == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Submission not found");
        }

        boolean isAdmin = ctx.isAdmin();
        boolean isOrganizer = competitionOrganizersService.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, submission.getCompetitionId())
                .eq(CompetitionOrganizers::getUserId, reviewerId)
                .exists();

        if (!isAdmin && !isOrganizer) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to review this submission");
        }

        if (!"APPROVED".equalsIgnoreCase(dto.getReviewStatus()) &&
                !"REJECTED".equalsIgnoreCase(dto.getReviewStatus())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid review status, must be APPROVED or REJECTED");
        }

        lockOpenSubmissions(submission.getCompetitionId());
        String competitionId = submission.getCompetitionId();
        submission = baseMapper.lockSubmission(dto.getSubmissionId());
        if (submission == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Submission not found");
        }
        if (!Objects.equals(competitionId, submission.getCompetitionId())) {
            throw new BusinessException(HttpStatus.CONFLICT, "Submission competition changed; reload before reviewing");
        }
        CompetitionResponseVO competition = competitionGateway.require(submission.getCompetitionId());
        if (competition.getStatus() != CompetitionStatus.ONGOING) {
            throw new BusinessException(HttpStatus.CONFLICT, "Review decisions are frozen when scoring opens");
        }
        submission.setReviewStatus(dto.getReviewStatus().toUpperCase());
        submission.setReviewComments(dto.getReviewComments());
        submission.setReviewedBy(reviewerId);
        submission.setReviewedAt(LocalDateTime.now());

        boolean updated = this.updateById(submission);
        if (!updated) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update submission review status");
        }

        UserBriefVO reviewer = Optional.ofNullable(
                userServiceClient.getUserBriefById(reviewerId).getBody()
        ).orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Reviewer info not found"));

        String notifyUserId;
        if (StrUtil.isNotBlank(submission.getTeamId())) {
            notifyUserId = Optional.ofNullable(
                            userServiceClient.getTeamCreator(submission.getTeamId()).getBody()
                    ).map(UserBriefVO::getId)
                    .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Team creator not found"));
        } else {
            notifyUserId = submission.getUserId();
        }

        UserBriefVO submitter = Optional.ofNullable(
                userServiceClient.getUserBriefById(notifyUserId).getBody()
        ).orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Submitter info not found"));

        SubmissionReviewedMessage message = new SubmissionReviewedMessage();
        message.setUserName(submitter.getName());
        message.setUserEmail(submitter.getEmail());
        message.setCompetitionName(competition.getName());
        message.setTitle(submission.getTitle());
        message.setReviewStatus(submission.getReviewStatus());
        message.setReviewComments(submission.getReviewComments());
        message.setReviewedAt(submission.getReviewedAt());
        message.setReviewedBy(reviewer.getName());

        submissionNotifier.sendSubmissionReviewed(message);
    }

    @Override
    public boolean isUserOrganizerOfSubmission(String submissionId, String userId) {
        SubmissionRecords submission = this.getById(submissionId);
        if (submission == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Submission not found");
        }

        return competitionOrganizersService.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, submission.getCompetitionId())
                .eq(CompetitionOrganizers::getUserId, userId)
                .exists();
    }

    @Override
    @Transactional
    public void deleteSubmission(String submissionId, RequestContext ctx) {
        String userId = ctx.userId();
        SubmissionRecords submission = this.getById(submissionId);
        if (submission == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Submission not found");
        }

        boolean isAdmin = ctx.isAdmin();
        boolean isOwner = userId.equals(submission.getUserId());
        boolean isOrganizer = competitionOrganizersService.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, submission.getCompetitionId())
                .eq(CompetitionOrganizers::getUserId, userId)
                .exists();

        if (!(isAdmin || isOwner || isOrganizer)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not allowed to delete this submission");
        }

        submission = reloadDeletableSubmission(submission, "Submission not found");
        deleteFileByUrl(submission.getFileUrl());

        boolean removed = this.removeById(submissionId);
        if (!removed) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete submission");
        }
    }

    @Override
    public Map<String, Boolean> getSubmissionStatusByTeam(List<String> teamIds, List<String> competitionIds) {
        if (CollUtil.isEmpty(teamIds) || CollUtil.isEmpty(competitionIds)) {
            return Collections.emptyMap();
        }

        return this.lambdaQuery()
                .in(SubmissionRecords::getTeamId, teamIds)
                .in(SubmissionRecords::getCompetitionId, competitionIds)
                .select(SubmissionRecords::getCompetitionId, SubmissionRecords::getTeamId)
                .list()
                .stream()
                .collect(Collectors.toMap(
                        s -> s.getCompetitionId() + ":" + s.getTeamId(),
                        s -> true,
                        (a, b) -> true
                ));
    }

    @Override
    public Map<String, BigDecimal> getSubmissionScoresByTeam(List<String> teamIds, List<String> competitionIds) {
        if (CollUtil.isEmpty(teamIds) || CollUtil.isEmpty(competitionIds)) {
            return Collections.emptyMap();
        }

        List<SubmissionRecords> records = this.lambdaQuery()
                .in(SubmissionRecords::getTeamId, teamIds)
                .in(SubmissionRecords::getCompetitionId, competitionIds)
                .eq(SubmissionRecords::getReviewStatus, "APPROVED")
                .list();
        Map<String, BigDecimal> visible = scores.visibleScores(records);
        return records.stream()
                .filter(s -> visible.containsKey(s.getId()))
                .collect(Collectors.toMap(
                        s -> s.getCompetitionId() + ":" + s.getTeamId(),
                        s -> visible.get(s.getId()),
                        (a, b) -> a
                ));
    }

    @Override
    @Transactional
    public void submitTeamWork(
            RequestContext ctx,
            String competitionId,
            String teamId,
            String title,
            String description,
            MultipartFile file) {

        ctx.requireAnyRole("PARTICIPANT");
        String userId = ctx.userId();

        Boolean isMember = requireTeamMembershipReply(userId, teamId);
        if (!isMember) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not a member of this team.");
        }

        CompetitionResponseVO competition = competitionGateway.require(competitionId);

        if (competition.getParticipationType() != com.w16a.danish.common.domain.enums.ParticipationType.TEAM) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "This competition requires an individual submission");
        }
        if (!competitionTeamsService.lambdaQuery().eq(CompetitionTeams::getCompetitionId, competitionId)
                .eq(CompetitionTeams::getTeamId, teamId).exists()) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "The team must register before submitting work");
        }
        if (!CompetitionStatus.isSubmittable(competition.getStatus())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Competition is not open for submissions.");
        }
        if (competition.getEndDate() != null && !competition.getEndDate().isAfter(LocalDateTime.now(java.time.ZoneOffset.UTC))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Competition has already ended.");
        }

        String fileUrl = Optional.ofNullable(fileServiceClient.uploadSubmission(file).getBody())
                .filter(StrUtil::isNotBlank)
                .orElseThrow(() -> new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload file."));
        rollbackCleanup.watch(com.w16a.danish.registration.service.SubmissionDownloads.objectName(fileUrl));

        SubmissionRecords submission = new SubmissionRecords()
                        .setCompetitionId(competitionId)
                        .setTeamId(teamId)
                        .setCreatedAt(LocalDateTime.now());
        persistUploadedSubmission(submission, title, description, file, fileUrl,
                "Failed to update existing team submission.", "Failed to save new team submission.");

        UserBriefVO user = Optional.ofNullable(userServiceClient.getUserBriefById(userId).getBody())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User info not found."));

        SubmissionUploadedMessage message = new SubmissionUploadedMessage();
        message.setUserName(user.getName());
        message.setUserEmail(user.getEmail());
        message.setCompetitionName(competition.getName());
        message.setTitle(title);
        message.setSubmittedAt(LocalDateTime.now());

        submissionNotifier.sendSubmissionUploaded(message);
    }

    @Override
    public TeamSubmissionInfoVO getTeamSubmissionPublic(String competitionId, String teamId) {
        requirePublicCompetition(competitionId);
        SubmissionRecords submission = this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getTeamId, teamId)
                .one();

        if (submission == null || !"APPROVED".equals(submission.getReviewStatus())) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Submission not found for the specified team.");
        }

        TeamSubmissionInfoVO vo = new TeamSubmissionInfoVO();
        vo.setSubmissionId(submission.getId());
        vo.setCompetitionId(submission.getCompetitionId());
        vo.setTeamId(submission.getTeamId());
        vo.setTitle(submission.getTitle());
        vo.setDescription(submission.getDescription());
        vo.setFileName(submission.getFileName());
        vo.setFileUrl("/submissions/public/" + submission.getId() + "/download");
        vo.setFileType(submission.getFileType());
        vo.setCreatedAt(submission.getCreatedAt());
        vo.setReviewStatus(submission.getReviewStatus());
        BigDecimal visible = scores.visibleScore(submission);
        vo.setTotalScore(visible == null ? null : visible.doubleValue());
        return vo;
    }

    @Override
    @Transactional
    public void deleteTeamSubmission(String submissionId, RequestContext ctx) {
        String userId = ctx.userId();
        SubmissionRecords submission = this.getById(submissionId);

        if (submission == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Submission not found.");
        }

        if (!ctx.isAdmin()) {
            if (StrUtil.isBlank(submission.getTeamId())) {
                throw new BusinessException(HttpStatus.FORBIDDEN, "This is not a team submission.");
            }

            Boolean isMember = requireTeamMembershipReply(userId, submission.getTeamId());
            if (!isMember) {
                throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to delete this submission.");
            }
        }

        submission = reloadDeletableSubmission(submission, "Submission not found.");
        if (StrUtil.isNotBlank(submission.getFileUrl())) {
            deleteFileByUrl(submission.getFileUrl());
        }

        boolean removed = this.removeById(submissionId);
        if (!removed) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete the team submission.");
        }
    }

    @Override
    public PageResponse<SubmissionInfoVO> listTeamSubmissionsByRole(
            String competitionId,
            RequestContext ctx,
            int page,
            int size,
            String keyword,
            String sortBy,
            String order) {

        String userId = ctx.userId();
        boolean isAdmin = ctx.isAdmin();
        boolean isOrganizer = competitionOrganizersService.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                .eq(CompetitionOrganizers::getUserId, userId)
                .exists();

        if (!isAdmin && !isOrganizer) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only organizers or admins can view team submissions.");
        }

        boolean asc = !"desc".equalsIgnoreCase(order);
        var query = this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .isNotNull(SubmissionRecords::getTeamId)
                .and(StrUtil.isNotBlank(keyword), w -> w
                        .like(SubmissionRecords::getTitle, keyword)
                        .or()
                        .like(SubmissionRecords::getDescription, keyword));
        switch (sortBy == null ? "" : sortBy) {
            case "title" -> query.orderBy(true, asc, SubmissionRecords::getTitle);
            case "totalScore" -> orderByCurrentScore(query, competitionId, asc);
            default -> query.orderBy(true, asc, SubmissionRecords::getCreatedAt);
        }

        // DB-level pagination (PaginationInnerInterceptor) — avoids loading every
        // team submission into the JVM just to slice one page.
        Page<SubmissionRecords> pageResult = new Page<>(page, size);
        query.page(pageResult);

        Map<String, BigDecimal> visible = scores.visibleScores(pageResult.getRecords());
        List<SubmissionInfoVO> vos = pageResult.getRecords().stream()
                .map(submission -> {
                    SubmissionInfoVO vo = new SubmissionInfoVO();
                    BeanUtil.copyProperties(submission, vo);
                    vo.setTotalScore(visible.get(submission.getId()));
                    vo.setFileUrl("/submissions/" + submission.getId() + "/download");
                    return vo;
                })
                .toList();

        return new PageResponse<>(vos, (int) pageResult.getTotal(), page, size, (int) pageResult.getPages());
    }

    @Override
    public PageResponse<SubmissionInfoVO> listPublicApprovedTeamSubmissions(
            String competitionId,
            int page,
            int size,
            String keyword,
            String sortBy,
            String order) {
        requirePublicCompetition(competitionId);
        validatePage(page, size);

        boolean asc = !"desc".equalsIgnoreCase(order);
        var query = this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getReviewStatus, "APPROVED")
                .isNotNull(SubmissionRecords::getTeamId)
                .and(StrUtil.isNotBlank(keyword), w -> w
                        .like(SubmissionRecords::getTitle, keyword)
                        .or()
                        .like(SubmissionRecords::getDescription, keyword));
        switch (sortBy == null ? "" : sortBy) {
            case "title" -> query.orderBy(true, asc, SubmissionRecords::getTitle);
            case "totalScore" -> orderByCurrentScore(query, competitionId, asc);
            default -> query.orderBy(true, asc, SubmissionRecords::getCreatedAt);
        }

        // DB-level pagination (PaginationInnerInterceptor) — avoids loading every
        // approved team submission into the JVM just to slice one page.
        Page<SubmissionRecords> pageResult = new Page<>(page, size);
        query.page(pageResult);

        Map<String, BigDecimal> visible = scores.visibleScores(pageResult.getRecords());
        List<SubmissionInfoVO> vos = pageResult.getRecords().stream()
                .map(submission -> {
                    SubmissionInfoVO vo = new SubmissionInfoVO();
                    BeanUtil.copyProperties(submission, vo);
                    vo.setTotalScore(visible.get(submission.getId()));
                    vo.setFileUrl("/submissions/public/" + submission.getId() + "/download");
                    vo.setReviewComments(null); vo.setReviewedBy(null); vo.setReviewedAt(null);
                    return vo;
                })
                .toList();

        return new PageResponse<>(vos, (int) pageResult.getTotal(), page, size, (int) pageResult.getPages());
    }

    @Override
    public Boolean existsByTeamId(String teamId) {
        if (StrUtil.isBlank(teamId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Team ID must not be blank.");
        }

        return this.lambdaQuery()
                .eq(SubmissionRecords::getTeamId, teamId)
                .exists();
    }

    // ── Internal API implementations (called by judge-service) ─────────────

    @Override
    public void updateTotalScore(String submissionId, BigDecimal totalScore, long version, int revision) {
        if (version < 1 || totalScore == null || totalScore.signum() < 0 || totalScore.compareTo(BigDecimal.TEN) > 0) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "A score between 0 and 10 and a positive version are required");
        }
        if (revision < 0) throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid submission revision");
        if (baseMapper.updateScoreVersioned(submissionId, totalScore, version, revision) == 0 && getById(submissionId) == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Submission not found");
        }
    }

    @Override
    public SubmissionInfoVO getMySubmissionBasic(String competitionId, String userId) {
        SubmissionRecords record = this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getUserId, userId)
                .one();
        return record == null ? null : toSubmissionInfoVO(record);
    }

    @Override
    public SubmissionInfoVO getTeamSubmissionBasic(String competitionId, String teamId) {
        SubmissionRecords record = this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getTeamId, teamId)
                .one();
        return record == null ? null : toSubmissionInfoVO(record);
    }

    @Override
    public List<SubmissionInfoVO> getTeamSubmissionsBasic(String competitionId, List<String> teamIds) {
        if (competitionId == null || teamIds == null || teamIds.isEmpty()) {
            return List.of();
        }
        return toSubmissionInfoVOs(this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .in(SubmissionRecords::getTeamId, teamIds)
                .list());
    }

    @Override
    public List<SubmissionInfoVO> getApprovedSubmissions(String competitionId) {
        competitionGateway.require(competitionId);
        return toSubmissionInfoVOs(lambdaQuery().eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getReviewStatus, "APPROVED").orderByAsc(SubmissionRecords::getId)
                .list());
    }

    private boolean requireTeamMembershipReply(String userId, String teamId) {
        ResponseEntity<Boolean> reply = userServiceClient.isUserInTeam(userId, teamId);
        if (reply == null || !reply.getStatusCode().is2xxSuccessful() || reply.getBody() == null) {
            throw new com.w16a.danish.common.exception.ServiceUnavailableException("user-service", "isUserInTeam");
        }
        return reply.getBody();
    }

    private void orderByCurrentScore(
            com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper<SubmissionRecords> query, String competitionId, boolean asc) {
        String order = scores.currentScoreOrder(competitionId, asc, query.getWrapper().getParamNameValuePairs());
        query.getWrapper().getExpression().add(com.baomidou.mybatisplus.core.enums.SqlKeyword.ORDER_BY,
                () -> order);
        query.orderByAsc(SubmissionRecords::getId);
    }

    private SubmissionInfoVO toSubmissionInfoVO(SubmissionRecords r) {
        return toSubmissionInfoVO(r, scores.visibleScore(r));
    }

    private List<SubmissionInfoVO> toSubmissionInfoVOs(List<SubmissionRecords> records) {
        Map<String, BigDecimal> visible = scores.visibleScores(records);
        return records.stream().map(record -> toSubmissionInfoVO(record, visible.get(record.getId()))).toList();
    }

    private SubmissionInfoVO toSubmissionInfoVO(SubmissionRecords r, BigDecimal visibleScore) {
        SubmissionInfoVO vo = new SubmissionInfoVO();
        vo.setId(r.getId());
        vo.setRevision(r.getRevision());
        vo.setCompetitionId(r.getCompetitionId());
        vo.setUserId(r.getUserId());
        vo.setTeamId(r.getTeamId());
        vo.setTitle(r.getTitle());
        vo.setDescription(r.getDescription());
        vo.setFileName(r.getFileName());
        vo.setFileUrl("/submissions/" + r.getId() + "/download");
        vo.setFileType(r.getFileType());
        vo.setReviewStatus(r.getReviewStatus());
        vo.setReviewComments(r.getReviewComments());
        vo.setReviewedBy(r.getReviewedBy());
        vo.setReviewedAt(r.getReviewedAt());
        vo.setTotalScore(visibleScore);
        vo.setCreatedAt(r.getCreatedAt());
        return vo;
    }

    private void persistUploadedSubmission(SubmissionRecords submission, String title, String description,
                                           MultipartFile file, String uploadedUrl, String updateFailure, String insertFailure) {
        lockOpenSubmissions(submission.getCompetitionId());
        var competition = competitionGateway.require(submission.getCompetitionId());
        if (competition.getEndDate() != null && !competition.getEndDate().isAfter(LocalDateTime.now(java.time.ZoneOffset.UTC))) {
            throw new BusinessException(HttpStatus.CONFLICT, "Submission deadline passed while the file was uploading");
        }
        boolean team = submission.getTeamId() != null;
        String registration = team
                ? baseMapper.lockTeamRegistration(submission.getCompetitionId(), submission.getTeamId())
                : baseMapper.lockIndividualRegistration(submission.getCompetitionId(), submission.getUserId());
        if (registration == null) {
            throw new BusinessException(HttpStatus.FORBIDDEN, team
                    ? "The team must register before submitting work" : "You must register before submitting work");
        }
        // A current locking read follows the shared run lock; never persist a pre-lock entity.
        SubmissionRecords current = baseMapper.lockOwnedSubmission(
                submission.getCompetitionId(), submission.getUserId(), submission.getTeamId());
        boolean replacing = current != null;
        if (replacing) submission = current;
        if (replacing) submission.setUpdatedAt(LocalDateTime.now());
        submission.setRevision((submission.getRevision() == null ? 0 : submission.getRevision()) + 1);
        String previousFileUrl = submission.getFileUrl();
        submission.setTitle(title)
                .setDescription(description)
                .setFileName(file.getOriginalFilename())
                .setFileUrl(uploadedUrl)
                .setFileType(file.getContentType())
                .setReviewStatus("PENDING")
                .setReviewedBy(null)
                .setReviewedAt(null)
                .setReviewComments(null)
                .setTotalScore(null);

        if (!replacing) {
            submission.setId(StrUtil.uuid());
        }
        boolean persisted = replacing ? this.updateById(submission) : this.save(submission);
        if (!persisted) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, replacing ? updateFailure : insertFailure);
        }
        // Keep the original file available when the replacement cannot be written.
        if (replacing) {
            deleteFileByUrl(previousFileUrl);
        }
    }

    private void deleteFileByUrl(String fileUrl) {
        if (StrUtil.isBlank(fileUrl)) {
            return;
        }
        String objectName = com.w16a.danish.registration.service.SubmissionDownloads.objectName(fileUrl);
        tasks.enqueue("SUBMISSION_FILE_DELETE", null, null, Map.of("objectName", objectName));
    }

    private void lockOpenSubmissions(String competitionId) {
        baseMapper.ensureLifecycleLock(competitionId);
        if (baseMapper.lockLifecycle(competitionId) != null || !"ONGOING".equals(baseMapper.competitionStatus(competitionId))) {
            throw new BusinessException(HttpStatus.CONFLICT, "Submission changes are locked when scoring or awarding starts");
        }
    }
    private void lockDeletableSubmissions(String competitionId) {
        baseMapper.ensureLifecycleLock(competitionId);
        var awardedAt = baseMapper.lockLifecycle(competitionId);
        String status = baseMapper.competitionStatus(competitionId);
        if (awardedAt != null || "COMPLETED".equals(status) || "AWARDED".equals(status)) {
            throw new BusinessException(HttpStatus.CONFLICT, "Completed submissions and results are retained");
        }
    }
    private SubmissionRecords reloadDeletableSubmission(SubmissionRecords observed, String notFoundMessage) {
        lockDeletableSubmissions(observed.getCompetitionId());
        SubmissionRecords current = baseMapper.lockSubmission(observed.getId());
        if (current == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, notFoundMessage);
        }
        if (!Objects.equals(observed.getCompetitionId(), current.getCompetitionId()) ||
                !Objects.equals(observed.getUserId(), current.getUserId()) ||
                !Objects.equals(observed.getTeamId(), current.getTeamId())) {
            throw new BusinessException(HttpStatus.CONFLICT, "Submission ownership changed; reload before deleting");
        }
        return current;
    }
    private void requirePublicCompetition(String competitionId) {
        if (!Boolean.TRUE.equals(competitionGateway.require(competitionId).getIsPublic())) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found");
        }
    }
    private void validatePage(int page, int size) {
        if (page < 1 || size < 1 || size > 100) throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid page or size");
    }

}
