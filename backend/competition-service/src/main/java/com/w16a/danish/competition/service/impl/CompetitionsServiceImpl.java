package com.w16a.danish.competition.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.bean.copier.CopyOptions;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.competition.notify.CompetitionNotifier;
import com.w16a.danish.competition.notify.CompetitionMediaFiles;
import com.w16a.danish.competition.domain.dto.AssignJudgesDTO;
import com.w16a.danish.competition.domain.CompetitionLifecycle;
import com.w16a.danish.competition.domain.dto.CompetitionCreateDTO;
import com.w16a.danish.competition.domain.dto.CompetitionUpdateDTO;
import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.common.messaging.message.JudgeAssignedMessage;
import com.w16a.danish.common.messaging.message.JudgeRemovedMessage;
import com.w16a.danish.competition.domain.po.CompetitionJudges;
import com.w16a.danish.competition.domain.po.CompetitionOrganizers;
import com.w16a.danish.competition.domain.po.Competitions;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.competition.feign.FileServiceClient;
import com.w16a.danish.competition.feign.UserServiceClient;
import com.w16a.danish.competition.mapper.CompetitionsMapper;
import com.w16a.danish.competition.service.ICompetitionJudgesService;
import com.w16a.danish.competition.service.ICompetitionOrganizersService;
import com.w16a.danish.competition.service.ICompetitionsService;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;


/**
 * @author Eddy ZHANG
 * @date 2025/03/18
 * @description ServiceImpl class for Competitions
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CompetitionsServiceImpl extends ServiceImpl<CompetitionsMapper, Competitions> implements ICompetitionsService {

    private static final List<String> VIDEO_CONTENT_TYPES = List.of("video/mp4", "video/avi", "video/mov", "video/x-msvideo", "video/quicktime");
    private static final List<String> IMAGE_CONTENT_TYPES = List.of("image/jpeg", "image/png", "image/gif");

    private final FileServiceClient fileServiceClient;
    private final ICompetitionOrganizersService competitionOrganizersService;
    private final UserServiceClient userServiceClient;
    private final ICompetitionJudgesService competitionJudgesService;
    private final CompetitionNotifier competitionNotifier;
    private final CompetitionMediaFiles mediaFiles;

    @Override
    @Transactional
    public CompetitionResponseVO createCompetition(CompetitionCreateDTO competitionDTO, RequestContext ctx) {
        log.info("Creating competition: name='{}', userId={}, role={}", competitionDTO.getName(), ctx.userId(), ctx.role());
        // validate user role
        ctx.requireAnyRole("ADMIN", "ORGANIZER");

        if (StrUtil.isNotBlank(competitionDTO.getIntroVideoUrl()) ||
                (competitionDTO.getImageUrls() != null && !competitionDTO.getImageUrls().isEmpty())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Upload competition media through its media endpoint");
        }

        CompetitionLifecycle.requireDates(competitionDTO.getStartDate(), competitionDTO.getEndDate());
        CompetitionLifecycle.requireCriteria(competitionDTO.getScoringCriteria());
        if (StrUtil.isNotBlank(competitionDTO.getStatus()) &&
                CompetitionStatus.fromString(competitionDTO.getStatus()) != CompetitionStatus.UPCOMING) {
            throw new BusinessException(HttpStatus.CONFLICT, "A new competition must start as UPCOMING");
        }

        // check if competition name already exists
        boolean exists = lambdaQuery()
                .eq(Competitions::getName, competitionDTO.getName())
                .exists();

        if (exists) {
            log.warn("Competition creation rejected - name already exists: '{}'", competitionDTO.getName());
            throw new BusinessException(HttpStatus.CONFLICT, "A competition with the same name already exists");
        }

        // create competition object
        Competitions competition = new Competitions();
        BeanUtils.copyProperties(competitionDTO, competition);
        competition.setId(StrUtil.uuid());
        competition.setStatus(CompetitionStatus.UPCOMING);
        save(competition);

        // Insert the user-competition mapping (organizer relationship) into competition_organizers table
        CompetitionOrganizers competitionOrganizers = new CompetitionOrganizers();
        competitionOrganizers.setId(StrUtil.uuid());
        competitionOrganizers.setCompetitionId(competition.getId());
        competitionOrganizers.setUserId(ctx.userId());
        competitionOrganizersService.save(competitionOrganizers);

        log.info("Competition created: id={}, name='{}', organizerId={}", competition.getId(), competition.getName(), ctx.userId());
        CompetitionResponseVO responseVO = new CompetitionResponseVO();
        BeanUtils.copyProperties(competition, responseVO);
        return responseVO;
    }

    @Override
    @Transactional
    public void deleteCompetition(String competitionId, RequestContext ctx) {
        ctx.requireAnyRole("ADMIN", "ORGANIZER");
        requireMutableRun(competitionId);

        Competitions competition = this.getById(competitionId);
        if (competition == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found");
        }

        if ("ORGANIZER".equalsIgnoreCase(ctx.role())) {
            boolean isOrganizer = competitionOrganizersService.lambdaQuery()
                    .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                    .eq(CompetitionOrganizers::getUserId, ctx.userId())
                    .exists();

            if (!isOrganizer) {
                throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to delete this competition");
            }
        }

        if (competition.getStatus() != CompetitionStatus.UPCOMING && competition.getStatus() != CompetitionStatus.CANCELED) {
            throw new BusinessException(HttpStatus.CONFLICT, "Cancel the competition before deleting it; completed results are retained");
        }
        mediaFiles.deleteAfterCommit(competition.getIntroVideoUrl());
        Optional.ofNullable(competition.getImageUrls()).orElse(List.of()).forEach(mediaFiles::deleteAfterCommit);
        competitionOrganizersService.remove(new LambdaQueryWrapper<CompetitionOrganizers>().eq(CompetitionOrganizers::getCompetitionId, competitionId));

        boolean isRemoved = this.removeById(competitionId);
        if (!isRemoved) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete competition");
        }
    }

    @Override
    public CompetitionResponseVO getCompetitionById(String competitionId) {
        Competitions competition = this.getById(competitionId);
        if (competition == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found with ID: " + competitionId);
        }

        CompetitionResponseVO response = new CompetitionResponseVO();
        BeanUtils.copyProperties(competition, response);
        return response;
    }

    @Override
    public CompetitionResponseVO getPublicCompetitionById(String competitionId) {
        var competition = getCompetitionById(competitionId);
        if (!Boolean.TRUE.equals(competition.getIsPublic())) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found");
        }
        return competition;
    }

    @Override
    public CompetitionResponseVO getManagedCompetitionById(String competitionId, RequestContext ctx) {
        ctx.requireAnyRole("ADMIN", "ORGANIZER", "JUDGE", "PARTICIPANT");
        var competition = getCompetitionById(competitionId);
        if (!Boolean.TRUE.equals(competition.getIsPublic()) && !canReadPrivateCompetition(competitionId, ctx)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found");
        }
        return competition;
    }

    @Override
    public List<CompetitionResponseVO> getVisibleCompetitionsByIds(List<String> ids, RequestContext ctx) {
        ctx.requireAnyRole("ADMIN", "ORGANIZER", "JUDGE", "PARTICIPANT");
        return getCompetitionsByIds(ids).stream()
                .filter(c -> Boolean.TRUE.equals(c.getIsPublic()) || canReadPrivateCompetition(c.getId(), ctx)).toList();
    }

    private boolean canReadPrivateCompetition(String competitionId, RequestContext ctx) {
        if (ctx.isAdmin()) return true;
        return switch (ctx.role().toUpperCase(java.util.Locale.ROOT)) {
            case "ORGANIZER" -> isUserOrganizer(competitionId, ctx.userId());
            case "JUDGE" -> isUserJudge(competitionId, ctx.userId());
            case "PARTICIPANT" -> baseMapper.isRegisteredEntrant(competitionId, ctx.userId());
            default -> false;
        };
    }

    @Override
    public PageResponse<CompetitionResponseVO> listCompetitions(String keyword, String status, String category, int page, int size) {
        return listCompetitions(keyword, status, category, null, page, size);
    }

    @Override
    public PageResponse<CompetitionResponseVO> listCompetitions(String keyword, String status, String category, String participationType, int page, int size) {
        return listCompetitions(keyword, status, category, participationType, page, size, true);
    }

    @Override
    public PageResponse<CompetitionResponseVO> listCompetitionsAdmin(RequestContext ctx, String keyword, String status,
            String category, String participationType, int page, int size) {
        ctx.requireAnyRole("ADMIN");
        return listCompetitions(keyword, status, category, participationType, page, size, false);
    }

    private PageResponse<CompetitionResponseVO> listCompetitions(String keyword, String status, String category,
            String participationType, int page, int size, boolean publicOnly) {
        if (page < 1 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Page must be positive and size must be between 1 and 100");
        }
        LambdaQueryWrapper<Competitions> wrapper = new LambdaQueryWrapper<>();

        if (StrUtil.isNotBlank(keyword)) {
            wrapper.like(Competitions::getName, keyword);
        }

        if (StrUtil.isNotBlank(status)) {
            wrapper.eq(Competitions::getStatus, CompetitionStatus.fromString(status));
        }

        if (StrUtil.isNotBlank(participationType)) {
            try {
                wrapper.eq(Competitions::getParticipationType, com.w16a.danish.common.domain.enums.ParticipationType.valueOf(participationType));
            } catch (IllegalArgumentException invalid) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid participation type");
            }
        }

        if (StrUtil.isNotBlank(category)) {
            wrapper.eq(Competitions::getCategory, category);
        }

        if (publicOnly) wrapper.eq(Competitions::getIsPublic, true);

        wrapper.orderByDesc(Competitions::getCreatedAt);

        Page<Competitions> mpPage = new Page<>(page, size);
        IPage<Competitions> resultPage = this.page(mpPage, wrapper);

        List<CompetitionResponseVO> voList = resultPage.getRecords().stream()
                .map(entity -> {
                    CompetitionResponseVO vo = new CompetitionResponseVO();
                    BeanUtil.copyProperties(entity, vo);
                    return vo;
                })
                .collect(Collectors.toList());

        return PageResponse.<CompetitionResponseVO>builder()
                .data(voList)
                .total(resultPage.getTotal())
                .page(resultPage.getCurrent())
                .size(resultPage.getSize())
                .pages(resultPage.getPages())
                .build();
    }

    @Override
    @Transactional
    public CompetitionResponseVO updateCompetition(String competitionId, RequestContext ctx, CompetitionUpdateDTO updateDTO) {
        ctx.requireAnyRole("ADMIN", "ORGANIZER");
        if (updateDTO.getIntroVideoUrl() != null || updateDTO.getImageUrls() != null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Use the media endpoints to modify competition assets");
        }
        requireMutableRun(competitionId);
        Competitions competition = this.getById(competitionId);
        if (competition == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found");
        }

        boolean isAdmin = "ADMIN".equalsIgnoreCase(ctx.role());
        boolean isOrganizer = "ORGANIZER".equalsIgnoreCase(ctx.role()) &&
                competitionOrganizersService.lambdaQuery()
                        .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                        .eq(CompetitionOrganizers::getUserId, ctx.userId())
                        .exists();

        if (!isAdmin && !isOrganizer) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to update this competition");
        }

        if (competition.getStatus() == CompetitionStatus.AWARDED || competition.getStatus() == CompetitionStatus.CANCELED) {
            throw new BusinessException(HttpStatus.CONFLICT, "Finished competition is immutable");
        }
        if (competition.getStatus() != CompetitionStatus.UPCOMING && (
                changed(updateDTO.getScoringCriteria(), competition.getScoringCriteria()) ||
                changed(updateDTO.getParticipationType(), competition.getParticipationType()) ||
                changed(updateDTO.getAllowedSubmissionTypes(), competition.getAllowedSubmissionTypes()) ||
                changed(updateDTO.getStartDate(), competition.getStartDate()) ||
                changed(updateDTO.getEndDate(), competition.getEndDate()))) {
            throw new BusinessException(HttpStatus.CONFLICT, "Dates, participation type and criteria are frozen after opening");
        }
        CompetitionStatus target = StrUtil.isNotBlank(updateDTO.getStatus())
                ? CompetitionStatus.fromString(updateDTO.getStatus()) : competition.getStatus();
        CompetitionLifecycle.requireTransition(competition.getStatus(), target, false);
        if (updateDTO.getScoringCriteria() != null) CompetitionLifecycle.requireCriteria(updateDTO.getScoringCriteria());
        CompetitionLifecycle.requireDates(updateDTO.getStartDate() == null ? competition.getStartDate() : updateDTO.getStartDate(),
                updateDTO.getEndDate() == null ? competition.getEndDate() : updateDTO.getEndDate());
        BeanUtil.copyProperties(updateDTO, competition, CopyOptions.create().ignoreNullValue().setIgnoreProperties("status"));
        competition.setStatus(target);

        competition.setUpdatedAt(null);

        boolean updated = this.updateById(competition);
        if (!updated) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update competition");
        }

        CompetitionResponseVO responseVO = new CompetitionResponseVO();
        BeanUtils.copyProperties(competition, responseVO);
        return responseVO;
    }

    @Override
    @Transactional
    public CompetitionResponseVO uploadCompetitionMedia(String competitionId, RequestContext ctx, String mediaType, MultipartFile file) {
        ctx.requireAnyRole("ADMIN", "ORGANIZER");
        requireMutableRun(competitionId);
        Competitions competition = this.getById(competitionId);
        if (competition == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found");
        }
        requireEditableMedia(competition);

        if ("ORGANIZER".equalsIgnoreCase(ctx.role())) {
            boolean isOrganizer = competitionOrganizersService.lambdaQuery()
                    .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                    .eq(CompetitionOrganizers::getUserId, ctx.userId())
                    .exists();
            if (!isOrganizer) {
                throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to upload media for this competition");
            }
        } else if (!"ADMIN".equalsIgnoreCase(ctx.role())) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to upload media for this competition");
        }

        String contentType = file.getContentType();
        if (StrUtil.isBlank(contentType)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Cannot detect file content type");
        }

        if ("VIDEO".equalsIgnoreCase(mediaType)) {
            if (!VIDEO_CONTENT_TYPES.contains(contentType)) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid video type. Allowed: MP4, AVI, MOV");
            }
        } else if ("IMAGE".equalsIgnoreCase(mediaType)) {
            if (!IMAGE_CONTENT_TYPES.contains(contentType)) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid image type. Allowed: JPG, PNG, GIF");
            }
            if (competition.getImageUrls() != null && competition.getImageUrls().size() >= 20) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "At most 20 competition images are allowed");
            }
        } else {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid media type. Supported: VIDEO or IMAGE");
        }

        String uploadedUrl = fileServiceClient.uploadCompetitionPromo(file).getBody();
        mediaFiles.watchUpload(uploadedUrl);

        if ("VIDEO".equalsIgnoreCase(mediaType)) {
            mediaFiles.deleteAfterCommit(competition.getIntroVideoUrl());
            competition.setIntroVideoUrl(uploadedUrl);
        } else {
            List<String> imageList = new ArrayList<>(Optional.ofNullable(competition.getImageUrls()).orElse(List.of()));
            imageList.add(uploadedUrl);
            competition.setImageUrls(imageList);
        }

        competition.setUpdatedAt(null);
        if (!this.updateById(competition)) throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save competition media");

        CompetitionResponseVO responseVO = new CompetitionResponseVO();
        BeanUtil.copyProperties(competition, responseVO);
        return responseVO;
    }

    @Override
    @Transactional
    public CompetitionResponseVO deleteCompetitionImage(String competitionId, RequestContext ctx, String imageUrl) {
        ctx.requireAnyRole("ADMIN", "ORGANIZER");
        requireMutableRun(competitionId);
        Competitions competition = this.getById(competitionId);
        if (competition == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found");
        }
        requireEditableMedia(competition);

        if ("ORGANIZER".equalsIgnoreCase(ctx.role())) {
            boolean isOrganizer = competitionOrganizersService.lambdaQuery()
                    .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                    .eq(CompetitionOrganizers::getUserId, ctx.userId())
                    .exists();
            if (!isOrganizer) {
                throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to modify this competition");
            }
        } else if (!"ADMIN".equalsIgnoreCase(ctx.role())) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to modify this competition");
        }

        List<String> currentImages = new ArrayList<>(Optional.ofNullable(competition.getImageUrls()).orElse(List.of()));
        if (!currentImages.remove(imageUrl)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Image URL not found in competition");
        }

        mediaFiles.deleteAfterCommit(imageUrl);

        competition.setImageUrls(currentImages);
        competition.setUpdatedAt(null);
        if (!this.updateById(competition)) throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save competition media");

        CompetitionResponseVO responseVO = new CompetitionResponseVO();
        BeanUtil.copyProperties(competition, responseVO);
        return responseVO;
    }

    @Override
    public PageResponse<CompetitionResponseVO> listCompetitionsByOrganizer(RequestContext ctx, int page, int size) {
        return listCompetitionsByOrganizer(ctx, page, size, null, null, null, null);
    }

    @Override
    public PageResponse<CompetitionResponseVO> listCompetitionsByOrganizer(RequestContext ctx, int page, int size,
            String keyword, String status, String category, String participationType) {
        ctx.requireAnyRole("ORGANIZER");
        if (page < 1 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Page must be positive and size must be between 1 and 100");
        }
        LambdaQueryWrapper<Competitions> wrapper = new LambdaQueryWrapper<>();
        if (StrUtil.isNotBlank(keyword)) wrapper.like(Competitions::getName, keyword.trim());
        if (StrUtil.isNotBlank(status)) wrapper.eq(Competitions::getStatus, CompetitionStatus.fromString(status));
        if (StrUtil.isNotBlank(category)) wrapper.eq(Competitions::getCategory, category);
        if (StrUtil.isNotBlank(participationType)) {
            try {
                wrapper.eq(Competitions::getParticipationType,
                        com.w16a.danish.common.domain.enums.ParticipationType.valueOf(participationType));
            } catch (IllegalArgumentException invalid) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid participation type");
            }
        }

        List<String> competitionIds = competitionOrganizersService.lambdaQuery()
                .eq(CompetitionOrganizers::getUserId, ctx.userId())
                .list()
                .stream()
                .map(CompetitionOrganizers::getCompetitionId)
                .toList();

        if (competitionIds.isEmpty()) {
            return PageResponse.<CompetitionResponseVO>builder()
                    .data(new ArrayList<>())
                    .total(0)
                    .page(page)
                    .size(size)
                    .pages(0)
                    .build();
        }

        wrapper.in(Competitions::getId, competitionIds)
                .orderByDesc(Competitions::getCreatedAt);

        Page<Competitions> mpPage = new Page<>(page, size);
        IPage<Competitions> resultPage = this.page(mpPage, wrapper);

        List<CompetitionResponseVO> voList = resultPage.getRecords().stream()
                .map(c -> BeanUtil.copyProperties(c, CompetitionResponseVO.class))
                .collect(Collectors.toList());

        return PageResponse.<CompetitionResponseVO>builder()
                .data(voList)
                .total(resultPage.getTotal())
                .page((int) resultPage.getCurrent())
                .size((int) resultPage.getSize())
                .pages((int) resultPage.getPages())
                .build();
    }

    @Override
    @Transactional
    public CompetitionResponseVO deleteIntroVideo(String competitionId, RequestContext ctx) {
        ctx.requireAnyRole("ADMIN", "ORGANIZER");
        requireMutableRun(competitionId);
        Competitions competition = this.getById(competitionId);
        if (competition == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found");
        }
        requireEditableMedia(competition);

        if (!isAuthorizedToModify(competitionId, ctx.userId(), ctx.role())) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to modify this competition");
        }

        String introVideoUrl = competition.getIntroVideoUrl();
        if (StrUtil.isBlank(introVideoUrl)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "No intro video to delete");
        }

        mediaFiles.deleteAfterCommit(introVideoUrl);

        UpdateWrapper<Competitions> updateWrapper = new UpdateWrapper<>();
        updateWrapper.eq("id", competitionId)
                .set("intro_video_url", null)
                .set("updated_at", LocalDateTime.now());

        boolean updated = this.update(updateWrapper);
        if (!updated) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update competition after deleting video");
        }

        Competitions updatedCompetition = this.getById(competitionId);
        CompetitionResponseVO responseVO = new CompetitionResponseVO();
        BeanUtil.copyProperties(updatedCompetition, responseVO);
        return responseVO;
    }

    @Override
    public List<CompetitionResponseVO> getCompetitionsByIds(List<String> ids) {
        if (CollUtil.isEmpty(ids)) {
            return Collections.emptyList();
        }
        if (ids.size() > 100) throw new BusinessException(HttpStatus.BAD_REQUEST, "At most 100 competition IDs are allowed");

        List<Competitions> competitions = this.lambdaQuery()
                .in(Competitions::getId, ids)
                .list();

        return competitions.stream()
                .map(c -> {
                    CompetitionResponseVO vo = new CompetitionResponseVO();
                    BeanUtil.copyProperties(c, vo);
                    return vo;
                })
                .toList();
    }

    @Override
    @Transactional
    public void assignJudges(String competitionId, RequestContext ctx, AssignJudgesDTO dto) {
        ctx.requireAnyRole("ADMIN", "ORGANIZER");
        requireMutableRun(competitionId);
        // Step 1: Validate competition existence
        Competitions competition = this.getById(competitionId);
        if (competition == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found.");
        }

        // Step 2: Check permission - Only ADMIN or the assigned ORGANIZER can assign judges
        boolean isAdmin = "ADMIN".equalsIgnoreCase(ctx.role());
        boolean isOrganizer = competitionOrganizersService.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                .eq(CompetitionOrganizers::getUserId, ctx.userId())
                .exists();

        if (!isAdmin && !isOrganizer) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to assign judges to this competition.");
        }

        // Step 3: Validate input emails
        if (dto.getJudgeEmails() == null || dto.getJudgeEmails().isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Judge email list cannot be empty.");
        }

        // Step 4: Query users by emails
        List<UserBriefVO> users = Optional.ofNullable(userServiceClient.getUsersByEmails(dto.getJudgeEmails()).getBody())
                .orElse(Collections.emptyList());

        if (users.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "No valid users found for provided emails.");
        }

        if (competition.getStatus() == CompetitionStatus.AWARDED || competition.getStatus() == CompetitionStatus.CANCELED) {
            throw new BusinessException(HttpStatus.CONFLICT, "Judge assignments are locked for this competition");
        }
        for (UserBriefVO user : users) {
            if (!"JUDGE".equalsIgnoreCase(user.getRole()) || isUserOrganizer(competitionId, user.getId())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Only Judge accounts outside the organizing team can be assigned");
            }
        }
        long requested = dto.getJudgeEmails().stream().map(e -> e.trim().toLowerCase(java.util.Locale.ROOT)).distinct().count();
        if (users.size() != requested) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Every requested Judge account must exist");
        }

        // Step 5: Get already assigned judges to avoid duplication
        List<String> existingJudgeUserIds = competitionJudgesService.lambdaQuery()
                .eq(CompetitionJudges::getCompetitionId, competitionId)
                .select(CompetitionJudges::getUserId)
                .list()
                .stream()
                .map(CompetitionJudges::getUserId)
                .toList();

        // Step 6: Filter out already assigned users
        List<CompetitionJudges> judgeList = users.stream()
                .filter(user -> !existingJudgeUserIds.contains(user.getId()))
                .map(user -> new CompetitionJudges()
                        .setId(StrUtil.uuid())
                        .setCompetitionId(competitionId)
                        .setUserId(user.getId()))
                .collect(Collectors.toList());

        if (judgeList.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "All users are already assigned as judges.");
        }

        // Step 7: Batch save judge records
        boolean saved = competitionJudgesService.saveBatch(judgeList);
        if (!saved) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to assign judges.");
        }

        // Step 8: After successful assignment, send MQ notification to each newly assigned judge
        for (UserBriefVO user : users) {
            if (!existingJudgeUserIds.contains(user.getId())) {
                JudgeAssignedMessage message = new JudgeAssignedMessage();
                message.setJudgeName(user.getName());
                message.setJudgeEmail(user.getEmail());
                message.setCompetitionName(competition.getName());
                message.setAssignedAt(LocalDateTime.now());

                competitionNotifier.sendJudgeAssigned(message);
            }
        }
    }

    @Override
    public PageResponse<UserBriefVO> listAssignedJudges(String competitionId, RequestContext ctx, int page, int size) {
        if (page < 1 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Page must be positive and size must be between 1 and 100");
        }
        // Step 1: Check if competition exists
        Competitions competition = this.getById(competitionId);
        if (competition == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found.");
        }

        // Step 2: Validate user permission
        boolean isAdmin = "ADMIN".equalsIgnoreCase(ctx.role());
        boolean isOrganizer = competitionOrganizersService.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                .eq(CompetitionOrganizers::getUserId, ctx.userId())
                .exists();
        if (!isAdmin && !isOrganizer) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to view assigned judges.");
        }

        // Step 3: Query assigned judge user IDs from competition_judges table
        Page<CompetitionJudges> judgePage = new Page<>(page, size);
        Page<CompetitionJudges> resultPage = competitionJudgesService.lambdaQuery()
                .eq(CompetitionJudges::getCompetitionId, competitionId)
                .page(judgePage);

        List<String> judgeUserIds = resultPage.getRecords().stream()
                .map(CompetitionJudges::getUserId)
                .toList();

        if (judgeUserIds.isEmpty()) {
            // No assigned judges, return empty result
            return PageResponse.<UserBriefVO>builder()
                    .data(Collections.emptyList())
                    .total(resultPage.getTotal())
                    .page(page)
                    .size(size)
                    .pages(resultPage.getPages())
                    .build();
        }

        // Step 4: Fetch user brief info for judgeUserIds
        List<UserBriefVO> userBriefs = userServiceClient.getUsersByIds(judgeUserIds, null).getBody();
        if (userBriefs == null) {
            userBriefs = Collections.emptyList();
        }

        // Step 5: Construct the paginated response
        return PageResponse.<UserBriefVO>builder()
                .data(userBriefs)
                .total(resultPage.getTotal())
                .page((int) resultPage.getCurrent())
                .size((int) resultPage.getSize())
                .pages((int) resultPage.getPages())
                .build();
    }

    @Override
    @Transactional
    public void removeJudge(String competitionId, RequestContext ctx, String judgeId) {
        ctx.requireAnyRole("ADMIN", "ORGANIZER");
        requireMutableRun(competitionId);
        // Step 1: Check if competition exists
        Competitions competition = this.getById(competitionId);
        if (competition == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found.");
        }

        // Step 2: Validate user permission (must be ADMIN or Organizer of this competition)
        boolean isAdmin = "ADMIN".equalsIgnoreCase(ctx.role());
        boolean isOrganizer = competitionOrganizersService.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                .eq(CompetitionOrganizers::getUserId, ctx.userId())
                .exists();
        if (!isAdmin && !isOrganizer) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to remove judges.");
        }

        // Step 3: Check if the judge is actually assigned to the competition
        boolean exists = competitionJudgesService.lambdaQuery()
                .eq(CompetitionJudges::getCompetitionId, competitionId)
                .eq(CompetitionJudges::getUserId, judgeId)
                .exists();
        if (!exists) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Judge is not assigned to this competition.");
        }

        // Step 4: Remove the judge assignment
        boolean removed = competitionJudgesService.lambdaUpdate()
                .eq(CompetitionJudges::getCompetitionId, competitionId)
                .eq(CompetitionJudges::getUserId, judgeId)
                .remove();
        if (!removed) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to remove judge from competition.");
        }

        UserBriefVO user = userServiceClient.getUserBriefById(judgeId).getBody();

        if (user != null) {
            // Step 6: Send MQ notification
            JudgeRemovedMessage message = new JudgeRemovedMessage();
            message.setJudgeName(user.getName());
            message.setJudgeEmail(user.getEmail());
            message.setCompetitionName(competition.getName());
            message.setRemovedAt(LocalDateTime.now());

            competitionNotifier.sendJudgeRemoved(message);
        }
    }

    @Override
    public boolean isUserOrganizer(String competitionId, String userId) {
        return competitionOrganizersService.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                .eq(CompetitionOrganizers::getUserId, userId)
                .exists();
    }

    @Override
    public boolean isUserJudge(String competitionId, String userId) {
        return competitionJudgesService.lambdaQuery().eq(CompetitionJudges::getCompetitionId, competitionId)
                .eq(CompetitionJudges::getUserId, userId).exists();
    }

    @Override
    public List<CompetitionResponseVO> listAllCompetitions() {
        List<Competitions> competitions = this.lambdaQuery()
                .eq(Competitions::getIsPublic, true)
                .orderByDesc(Competitions::getCreatedAt)
                .list();

        if (CollUtil.isEmpty(competitions)) {
            return Collections.emptyList();
        }

        return competitions.stream()
                .map(entity -> {
                    CompetitionResponseVO vo = new CompetitionResponseVO();
                    BeanUtil.copyProperties(entity, vo);
                    return vo;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CompetitionResponseVO updateCompetitionStatus(String competitionId, String newStatus) {
        if (StrUtil.isBlank(competitionId) || StrUtil.isBlank(newStatus)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Competition ID and status must not be blank.");
        }

        Competitions competition = this.getById(competitionId);
        if (competition == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found.");
        }

        CompetitionStatus validatedStatus;
        try {
            validatedStatus = CompetitionStatus.fromString(newStatus);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid competition status: " + newStatus);
        }

        if (validatedStatus != CompetitionStatus.AWARDED) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Internal status writes can only finish awarding");
        }
        CompetitionLifecycle.requireTransition(competition.getStatus(), validatedStatus, true);
        competition.setStatus(validatedStatus);
        competition.setUpdatedAt(LocalDateTime.now());
        boolean updated = this.updateById(competition);

        if (!updated) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update competition status.");
        }

        CompetitionResponseVO responseVO = new CompetitionResponseVO();
        BeanUtil.copyProperties(competition, responseVO);
        return responseVO;
    }


    private static boolean changed(Object replacement, Object current) {
        return replacement != null && !Objects.equals(replacement, current);
    }

    private void requireMutableRun(String competitionId) {
        baseMapper.ensureLifecycleLock(competitionId);
        if (baseMapper.lockLifecycle(competitionId) != null) {
            throw new BusinessException(HttpStatus.CONFLICT, "Awards have been finalized; competition changes are locked");
        }
    }

    private static void requireEditableMedia(Competitions competition) {
        if (competition.getStatus() == CompetitionStatus.COMPLETED || competition.getStatus() == CompetitionStatus.AWARDED
                || competition.getStatus() == CompetitionStatus.CANCELED) {
            throw new BusinessException(HttpStatus.CONFLICT, "Competition media is locked after the competition ends");
        }
    }

    private boolean isAuthorizedToModify(String competitionId, String userId, String userRole) {
        if ("ADMIN".equalsIgnoreCase(userRole)) {
            return true;
        }
        if ("ORGANIZER".equalsIgnoreCase(userRole)) {
            return competitionOrganizersService.lambdaQuery()
                    .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                    .eq(CompetitionOrganizers::getUserId, userId)
                    .exists();
        }
        return false;
    }

}
