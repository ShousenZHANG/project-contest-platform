package com.w16a.danish.registration.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.registration.notify.RegistrationNotifier;
import com.w16a.danish.common.messaging.message.ParticipantRemovedMessage;
import com.w16a.danish.common.messaging.message.RegisterSuccessMessage;
import com.w16a.danish.registration.domain.po.CompetitionOrganizers;
import com.w16a.danish.registration.domain.po.CompetitionParticipants;
import com.w16a.danish.registration.domain.po.CompetitionTeams;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.registration.domain.vo.*;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.common.domain.enums.ParticipationType;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.feign.UserServiceClient;
import com.w16a.danish.registration.mapper.CompetitionParticipantsMapper;
import com.w16a.danish.registration.service.ICompetitionOrganizersService;
import com.w16a.danish.registration.service.ICompetitionParticipantsService;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.w16a.danish.registration.service.ICompetitionTeamsService;
import com.w16a.danish.registration.service.ISubmissionRecordsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;

/**
 *
 * This class handles the registration of participants for competitions.
 *
 * @author Eddy ZHANG
 * @date 2025/04/03
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CompetitionParticipantsServiceImpl extends ServiceImpl<CompetitionParticipantsMapper, CompetitionParticipants> implements ICompetitionParticipantsService {

    private final CompetitionGateway competitionGateway;
    private final ICompetitionOrganizersService competitionOrganizersService;
    private final UserServiceClient userServiceClient;
    private final ISubmissionRecordsService submissionService;
    private final RegistrationNotifier registrationNotifier;
    private final ICompetitionTeamsService competitionTeamsService;

    @Override
    @Transactional
    public void register(String competitionId, RequestContext ctx) {
        ctx.requireAnyRole("PARTICIPANT");
        String userId = ctx.userId();

        CompetitionResponseVO competition;
        try {
            competition = competitionGateway.require(competitionId);

            if (competition.getParticipationType() != com.w16a.danish.common.domain.enums.ParticipationType.INDIVIDUAL) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "This competition requires team registration");
            }

            if (!CompetitionStatus.isRegistrable(competition.getStatus())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Registration is only allowed for UPCOMING or ONGOING competitions");
            }
            if (competition.getEndDate() != null && !competition.getEndDate().isAfter(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC))) {
                throw new BusinessException(HttpStatus.CONFLICT, "Registration deadline has passed");
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception e) {
            throw new BusinessException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Failed to verify competition with competition-service: " + e.getMessage()
            );
        }

        lockOpenRegistrations(competitionId);
        boolean alreadyRegistered = lambdaQuery()
                .eq(CompetitionParticipants::getCompetitionId, competitionId)
                .eq(CompetitionParticipants::getUserId, userId)
                .exists();

        if (alreadyRegistered) {
            throw new BusinessException(HttpStatus.CONFLICT, "You have already registered for this competition");
        }

        CompetitionParticipants participant = new CompetitionParticipants()
                .setId(StrUtil.uuid())
                .setCompetitionId(competitionId)
                .setUserId(userId);

        boolean saved = this.save(participant);
        if (!saved) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to register for the competition");
        }

        ResponseEntity<UserBriefVO> response = userServiceClient.getUserBriefById(userId);
        UserBriefVO user = response.getBody();

        if (user == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "User not found when sending registration notification");
        }

        RegisterSuccessMessage message = new RegisterSuccessMessage();
        message.setUserName(user.getName());
        message.setUserEmail(user.getEmail());
        message.setCompetitionName(competition.getName());
        message.setRegisterTime(LocalDateTime.now());
        registrationNotifier.sendRegisterSuccess(message);

    }

    @Override
    @Transactional
    public void cancelRegistration(String competitionId, RequestContext ctx) {
        ctx.requireAnyRole("PARTICIPANT");
        String userId = ctx.userId();

        CompetitionParticipants existing = lambdaQuery()
                .eq(CompetitionParticipants::getCompetitionId, competitionId)
                .eq(CompetitionParticipants::getUserId, userId)
                .one();

        if (existing == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "You have not registered for this competition");
        }

        lockCancelableRegistrations(competitionId);

        boolean hasSubmission = submissionService.lambdaQuery()
                .eq(SubmissionRecords::getUserId, userId)
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .exists();

        if (hasSubmission) {
            submissionService.deleteSubmissionsByUserAndCompetition(userId, competitionId);
        }

        boolean removed = this.removeById(existing.getId());
        if (!removed) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to cancel registration");
        }
    }

    @Override
    public boolean isRegistered(String competitionId, RequestContext ctx) {
        ctx.requireAnyRole("PARTICIPANT");
        return lambdaQuery()
                .eq(CompetitionParticipants::getCompetitionId, competitionId)
                .eq(CompetitionParticipants::getUserId, ctx.userId())
                .exists();
    }

    @Override
    public PageResponse<CompetitionParticipationVO> getMyCompetitionsWithSearch(
            RequestContext ctx,
            int page,
            int size,
            String keyword,
            String sortBy,
            String order
    ) {
        ctx.requireAnyRole("PARTICIPANT");
        requirePage(page, size);
        String userId = ctx.userId();

        List<CompetitionParticipants> participants = lambdaQuery()
                .eq(CompetitionParticipants::getUserId, userId)
                .list();

        if (participants.isEmpty()) {
            return new PageResponse<>(Collections.emptyList(), 0, page, size, 0);
        }

        Map<String, LocalDateTime> registeredAtMap = participants.stream()
                .collect(Collectors.toMap(CompetitionParticipants::getCompetitionId, CompetitionParticipants::getCreatedAt));
        List<String> competitionIds = new ArrayList<>(registeredAtMap.keySet());

        List<CompetitionResponseVO> competitions = competitionGateway.findAll(competitionIds);

        Map<String, Boolean> hasSubmittedMap = submissionService.getSubmissionStatus(userId, competitionIds);
        Map<String, BigDecimal> scoreMap = submissionService.getSubmissionScores(userId, competitionIds);

        List<CompetitionParticipationVO> all = competitions.stream().map(c -> {
            CompetitionParticipationVO vo = new CompetitionParticipationVO();
            vo.setCompetitionId(c.getId());
            vo.setCompetitionName(c.getName());
            vo.setCategory(c.getCategory());
            vo.setStatus(c.getStatus().getValue());
            vo.setStartDate(c.getStartDate());
            vo.setEndDate(c.getEndDate());
            vo.setIsPublic(c.getIsPublic());
            vo.setJoinedAt(registeredAtMap.get(c.getId()));
            vo.setHasSubmitted(hasSubmittedMap.getOrDefault(c.getId(), false));
            vo.setTotalScore(scoreMap.getOrDefault(c.getId(), null));
            return vo;
        }).toList();

        if (StrUtil.isNotBlank(keyword)) {
            all = all.stream()
                    .filter(vo -> StrUtil.containsIgnoreCase(vo.getCompetitionName(), keyword)
                            || StrUtil.containsIgnoreCase(vo.getCategory(), keyword))
                    .toList();
        }

        Comparator<CompetitionParticipationVO> comparator = switch (sortBy) {
            case "category" -> Comparator.comparing(CompetitionParticipationVO::getCategory, String.CASE_INSENSITIVE_ORDER);
            case "startDate" -> Comparator.comparing(CompetitionParticipationVO::getStartDate);
            case "endDate" -> Comparator.comparing(CompetitionParticipationVO::getEndDate);
            case "totalScore" -> Comparator.comparing(vo -> Optional.ofNullable(vo.getTotalScore()).orElse(BigDecimal.ZERO));
            case "joinedAt" -> Comparator.comparing(CompetitionParticipationVO::getJoinedAt);
            default -> Comparator.comparing(CompetitionParticipationVO::getCompetitionName, String.CASE_INSENSITIVE_ORDER);
        };
        if ("desc".equalsIgnoreCase(order)) {
            comparator = comparator.reversed();
        }
        all = all.stream().sorted(comparator).toList();

        int total = all.size();
        int fromIndex = (int) Math.min((long) (page - 1) * size, total);
        int toIndex = (int) Math.min((long) fromIndex + size, total);
        List<CompetitionParticipationVO> pagedList = all.subList(fromIndex, toIndex);

        return new PageResponse<>(pagedList, total, page, size, (int) Math.ceil((double) total / size));
    }

    @Override
    public PageResponse<ParticipantInfoVO> getParticipantsByCompetitionWithSearch(
            String competitionId,
            RequestContext ctx,
            int page,
            int size,
            String keyword,
            String sortBy,
            String order
    ) {
        ctx.requireAnyRole("ORGANIZER");
        requirePage(page, size);
        String organizerId = ctx.userId();

        boolean isOwner = competitionOrganizersService.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                .eq(CompetitionOrganizers::getUserId, organizerId)
                .exists();

        if (!isOwner) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized for this competition");
        }

        // query participants
        List<CompetitionParticipants> participants = lambdaQuery()
                .eq(CompetitionParticipants::getCompetitionId, competitionId)
                .list();

        if (participants.isEmpty()) {
            return new PageResponse<>(Collections.emptyList(), 0, page, size, 0);
        }

        Map<String, LocalDateTime> userRegisteredAtMap = participants.stream()
                .collect(Collectors.toMap(CompetitionParticipants::getUserId, CompetitionParticipants::getCreatedAt));

        List<String> userIds = new ArrayList<>(userRegisteredAtMap.keySet());

        // safe check
        List<UserBriefVO> userList = new ArrayList<>();
        for (int start = 0; start < userIds.size(); start += 100) {
            userList.addAll(requireUserReply(userServiceClient.getUsersByIds(
                    userIds.subList(start, Math.min(start + 100, userIds.size())), "PARTICIPANT"), "getUsersByIds"));
        }

        List<ParticipantInfoVO> allParticipants = userList.stream()
                .map(user -> {
                    ParticipantInfoVO vo = new ParticipantInfoVO();
                    vo.setUserId(user.getId());
                    vo.setName(user.getName());
                    vo.setEmail(user.getEmail());
                    vo.setAvatarUrl(user.getAvatarUrl());
                    vo.setDescription(user.getDescription());
                    vo.setRegisteredAt(userRegisteredAtMap.get(user.getId()));
                    return vo;
                })
                .toList();

        // search by keyword
        if (StrUtil.isNotBlank(keyword)) {
            allParticipants = allParticipants.stream()
                    .filter(u -> StrUtil.containsIgnoreCase(u.getName(), keyword)
                            || StrUtil.containsIgnoreCase(u.getEmail(), keyword))
                    .toList();
        }

        // sort by specified field
        Comparator<ParticipantInfoVO> comparator = switch (sortBy) {
            case "email" -> Comparator.comparing(ParticipantInfoVO::getEmail, String.CASE_INSENSITIVE_ORDER);
            case "registeredAt" -> Comparator.comparing(ParticipantInfoVO::getRegisteredAt);
            default -> Comparator.comparing(ParticipantInfoVO::getName, String.CASE_INSENSITIVE_ORDER);
        };
        if ("desc".equalsIgnoreCase(order)) {
            comparator = comparator.reversed();
        }
        allParticipants = allParticipants.stream().sorted(comparator).toList();

        // pagination
        int total = allParticipants.size();
        int fromIndex = (int) Math.min((long) (page - 1) * size, total);
        int toIndex = (int) Math.min((long) fromIndex + size, total);
        List<ParticipantInfoVO> pagedList = allParticipants.subList(fromIndex, toIndex);

        return new PageResponse<>(pagedList, total, page, size, (int) Math.ceil((double) total / size));
    }

    @Override
    @Transactional
    public void cancelByOrganizer(String competitionId, String participantUserId, RequestContext ctx) {
        ctx.requireAnyRole("ORGANIZER");
        String organizerId = ctx.userId();

        boolean isOwner = competitionOrganizersService.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                .eq(CompetitionOrganizers::getUserId, organizerId)
                .exists();

        if (!isOwner) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to manage this competition");
        }

        CompetitionParticipants existing = lambdaQuery()
                .eq(CompetitionParticipants::getCompetitionId, competitionId)
                .eq(CompetitionParticipants::getUserId, participantUserId)
                .one();

        if (existing == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Participant is not registered for this competition");
        }

        lockCancelableRegistrations(competitionId);

        boolean hasSubmission = submissionService.lambdaQuery()
                .eq(SubmissionRecords::getUserId, participantUserId)
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .exists();

        if (hasSubmission) {
            submissionService.deleteSubmissionsByUserAndCompetition(participantUserId, competitionId);
        }

        boolean removed = this.removeById(existing.getId());
        if (!removed) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to cancel participant registration");
        }

        ResponseEntity<UserBriefVO> userResp = userServiceClient.getUserBriefById(participantUserId);
        UserBriefVO participant = userResp.getBody();
        if (participant == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Participant info not found");
        }

        ResponseEntity<UserBriefVO> organizerResp = userServiceClient.getUserBriefById(organizerId);
        UserBriefVO organizer = organizerResp.getBody();
        if (organizer == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Organizer info not found");
        }

        CompetitionResponseVO competition = competitionGateway.require(competitionId);

        ParticipantRemovedMessage message = new ParticipantRemovedMessage();
        message.setUserName(participant.getName());
        message.setUserEmail(participant.getEmail());
        message.setRemovedBy(organizer.getName());
        message.setCompetitionName(competition.getName());
        message.setRemovedAt(LocalDateTime.now());
        registrationNotifier.sendParticipantRemoved(message);
    }

    @Override
    @Transactional
    public void registerTeam(String competitionId, String teamId, RequestContext ctx) {
        ctx.requireAnyRole("PARTICIPANT");
        String userId = ctx.userId();

        ResponseEntity<UserBriefVO> creatorResponse = userServiceClient.getTeamCreator(teamId);
        UserBriefVO creator = creatorResponse.getBody();
        if (creator == null || !userId.equals(creator.getId())) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only the team creator can register the team.");
        }

        CompetitionResponseVO competition;
        try {
            competition = competitionGateway.require(competitionId);

            if (!CompetitionStatus.isRegistrable(competition.getStatus())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Competition is not open for registration.");
            }

            if (competition.getParticipationType() != ParticipationType.TEAM) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "This competition only supports team registration.");
            }
            if (competition.getEndDate() != null && !competition.getEndDate().isAfter(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC))) {
                throw new BusinessException(HttpStatus.CONFLICT, "Registration deadline has passed");
            }

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Failed to validate competition: " + e.getMessage());
        }

        lockOpenRegistrations(competitionId);
        boolean alreadyRegistered = competitionTeamsService.lambdaQuery()
                .eq(CompetitionTeams::getCompetitionId, competitionId)
                .eq(CompetitionTeams::getTeamId, teamId)
                .exists();

        if (alreadyRegistered) {
            throw new BusinessException(HttpStatus.CONFLICT, "This team has already registered for the competition.");
        }

        CompetitionTeams teamRegistration = new CompetitionTeams()
                .setId(StrUtil.uuid())
                .setCompetitionId(competitionId)
                .setTeamId(teamId);

        boolean saved = competitionTeamsService.save(teamRegistration);
        if (!saved) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to register the team for the competition.");
        }

        ResponseEntity<UserBriefVO> userResponse = userServiceClient.getUserBriefById(userId);
        UserBriefVO user = userResponse.getBody();
        if (user == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "User info not found.");
        }

        RegisterSuccessMessage message = new RegisterSuccessMessage();
        message.setUserName(user.getName());
        message.setUserEmail(user.getEmail());
        message.setCompetitionName(competition.getName());
        message.setRegisterTime(LocalDateTime.now());

        registrationNotifier.sendRegisterSuccess(message);
    }


    @Override
    @Transactional
    public void cancelTeamRegistration(String competitionId, String teamId, RequestContext ctx) {
        ctx.requireAnyRole("PARTICIPANT");
        String userId = ctx.userId();

        // Step 1: Validate team creator
        ResponseEntity<UserBriefVO> creatorResp = userServiceClient.getTeamCreator(teamId);
        UserBriefVO creator = creatorResp.getBody();
        if (creator == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Team creator not found.");
        }
        if (!creator.getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only the team creator can cancel the registration.");
        }

        // Step 2: Query competition_teams registration record
        CompetitionTeams registration = competitionTeamsService.lambdaQuery()
                .eq(CompetitionTeams::getCompetitionId, competitionId)
                .eq(CompetitionTeams::getTeamId, teamId)
                .one();

        if (registration == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "This team is not registered for the competition.");
        }

        lockCancelableRegistrations(competitionId);

        // Step 3: Delete all submissions made by the team for this competition
        boolean hasTeamSubmission = submissionService.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getTeamId, teamId)
                .exists();

        if (hasTeamSubmission) {
            submissionService.deleteSubmissionsByTeamAndCompetition(teamId, competitionId);
        }

        // Step 4: Remove team registration record from competition_teams
        boolean removed = competitionTeamsService.removeById(registration.getId());
        if (!removed) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to cancel team registration.");
        }
    }

    @Override
    public boolean isTeamRegistered(String competitionId, String teamId, RequestContext ctx) {
        CompetitionResponseVO competition = competitionGateway.require(competitionId);
        if (!Boolean.TRUE.equals(competition.getIsPublic()) && !canReadCompetition(competitionId, ctx)) {
            requireTeamAccess(teamId, ctx);
        }
        // Check whether the team is already registered for the given competition
        return competitionTeamsService.lambdaQuery()
                .eq(CompetitionTeams::getCompetitionId, competitionId)
                .eq(CompetitionTeams::getTeamId, teamId)
                .exists();
    }

    @Override
    public PageResponse<TeamInfoVO> getTeamsByCompetitionWithSearch(
            String competitionId,
            int page,
            int size,
            String keyword,
            String sortBy,
            String order
    ) {
        requirePage(page, size);
        // Step 1: Query all registered teams for the competition from competition_teams
        List<CompetitionTeams> competitionTeams = competitionTeamsService.lambdaQuery()
                .eq(CompetitionTeams::getCompetitionId, competitionId)
                .list();

        if (competitionTeams.isEmpty()) {
            return new PageResponse<>(Collections.emptyList(), 0, page, size, 0);
        }

        // Step 2: Extract unique teamIds
        List<String> teamIds = competitionTeams.stream()
                .map(CompetitionTeams::getTeamId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        // Step 3: Call user-service to get team brief info
        List<TeamInfoVO> allTeams = new ArrayList<>();
        for (int start = 0; start < teamIds.size(); start += 100) {
            allTeams.addAll(requireUserReply(userServiceClient.getTeamBriefByIds(
                    teamIds.subList(start, Math.min(start + 100, teamIds.size()))), "getTeamBriefByIds"));
        }

        // Step 4: Apply keyword filtering if needed
        if (StrUtil.isNotBlank(keyword)) {
            allTeams = allTeams.stream()
                    .filter(team ->
                            StrUtil.containsIgnoreCase(team.getTeamName(), keyword)
                                    || StrUtil.containsIgnoreCase(team.getDescription(), keyword))
                    .toList();
        }

        // Step 5: Sorting
        Comparator<TeamInfoVO> comparator = switch (sortBy) {
            case "createdAt" -> Comparator.comparing(TeamInfoVO::getCreatedAt);
            case "teamName" -> Comparator.comparing(TeamInfoVO::getTeamName, String.CASE_INSENSITIVE_ORDER);
            default -> Comparator.comparing(TeamInfoVO::getCreatedAt);
        };

        if ("desc".equalsIgnoreCase(order)) {
            comparator = comparator.reversed();
        }

        allTeams = allTeams.stream().sorted(comparator).toList();

        // Step 6: Pagination
        int total = allTeams.size();
        int fromIndex = (int) Math.min((long) (page - 1) * size, total);
        int toIndex = (int) Math.min((long) fromIndex + size, total);
        List<TeamInfoVO> pagedList = allTeams.subList(fromIndex, toIndex);

        return new PageResponse<>(pagedList, total, page, size, (int) Math.ceil((double) total / size));
    }

    @Override
    public PageResponse<TeamInfoVO> getManagedTeamsByCompetitionWithSearch(
            String competitionId, RequestContext ctx, int page, int size, String keyword, String sortBy, String order) {
        requirePage(page, size);
        competitionGateway.require(competitionId);
        if (!canReadCompetition(competitionId, ctx)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized for this competition");
        }
        return getTeamsByCompetitionWithSearch(competitionId, page, size, keyword, sortBy, order);
    }

    @Override
    public PageResponse<CompetitionParticipationVO> getCompetitionsRegisteredByTeam(
            String teamId, RequestContext ctx, int page, int size, String keyword, String sortBy, String order) {
        requirePage(page, size);
        requireTeamAccess(teamId, ctx);
        List<CompetitionTeams> registrations = competitionTeamsService.lambdaQuery()
                .eq(CompetitionTeams::getTeamId, teamId)
                .list();

        if (CollUtil.isEmpty(registrations)) {
            return new PageResponse<>(Collections.emptyList(), 0, page, size, 0);
        }

        Map<String, LocalDateTime> joinedMap = registrations.stream()
                .collect(Collectors.toMap(
                        CompetitionTeams::getCompetitionId,
                        CompetitionTeams::getJoinedAt,
                        (a, b) -> a
                ));

        List<String> competitionIds = registrations.stream()
                .map(CompetitionTeams::getCompetitionId)
                .distinct()
                .toList();

        List<CompetitionResponseVO> competitions = competitionGateway.findAll(competitionIds);

        Map<String, Boolean> submissionMap = submissionService.getSubmissionStatusByTeam(List.of(teamId), competitionIds);
        Map<String, BigDecimal> scoreMap = submissionService.getSubmissionScoresByTeam(List.of(teamId), competitionIds);

        List<CompetitionParticipationVO> result = competitions.stream().map(c -> {
            String key = c.getId() + ":" + teamId;
            return new CompetitionParticipationVO()
                    .setCompetitionId(c.getId())
                    .setCompetitionName(c.getName())
                    .setCategory(c.getCategory())
                    .setStatus(c.getStatus().getValue())
                    .setStartDate(c.getStartDate())
                    .setEndDate(c.getEndDate())
                    .setIsPublic(c.getIsPublic())
                    .setJoinedAt(joinedMap.get(c.getId()))
                    .setHasSubmitted(submissionMap.getOrDefault(key, false))
                    .setTotalScore(scoreMap.getOrDefault(key, null));
        }).toList();

        if (StrUtil.isNotBlank(keyword)) {
            result = result.stream().filter(vo ->
                    StrUtil.containsIgnoreCase(vo.getCompetitionName(), keyword)
                            || StrUtil.containsIgnoreCase(vo.getCategory(), keyword)
            ).toList();
        }

        Comparator<CompetitionParticipationVO> comparator = switch (sortBy) {
            case "category" -> Comparator.comparing(CompetitionParticipationVO::getCategory, String.CASE_INSENSITIVE_ORDER);
            case "startDate" -> Comparator.comparing(CompetitionParticipationVO::getStartDate);
            case "endDate" -> Comparator.comparing(CompetitionParticipationVO::getEndDate);
            case "totalScore" -> Comparator.comparing(vo -> Optional.ofNullable(vo.getTotalScore()).orElse(BigDecimal.ZERO));
            case "joinedAt" -> Comparator.comparing(CompetitionParticipationVO::getJoinedAt);
            default -> Comparator.comparing(CompetitionParticipationVO::getCompetitionName, String.CASE_INSENSITIVE_ORDER);
        };
        if ("desc".equalsIgnoreCase(order)) {
            comparator = comparator.reversed();
        }

        result = result.stream().sorted(comparator).toList();

        int total = result.size();
        int fromIndex = (int) Math.min((long) (page - 1) * size, total);
        if (fromIndex >= total) {
            return new PageResponse<>(Collections.emptyList(), total, page, size, (int) Math.ceil((double) total / size));
        }

        int toIndex = (int) Math.min((long) fromIndex + size, total);
        List<CompetitionParticipationVO> paged = result.subList(fromIndex, toIndex);

        return new PageResponse<>(paged, total, page, size, (int) Math.ceil((double) total / size));
    }

    @Override
    @Transactional
    public void cancelTeamByOrganizer(String competitionId, String teamId, RequestContext ctx) {
        ctx.requireAnyRole("ORGANIZER", "ADMIN");
        String userId = ctx.userId();

        boolean isOrganizer = competitionOrganizersService.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                .eq(CompetitionOrganizers::getUserId, userId)
                .exists();

        if (!isOrganizer && !ctx.isAdmin()) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to manage this competition.");
        }

        CompetitionTeams record = competitionTeamsService.lambdaQuery()
                .eq(CompetitionTeams::getCompetitionId, competitionId)
                .eq(CompetitionTeams::getTeamId, teamId)
                .one();

        if (record == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "The team is not registered for this competition.");
        }

        lockCancelableRegistrations(competitionId);

        submissionService.deleteSubmissionsByTeamAndCompetition(teamId, competitionId);

        boolean removed = competitionTeamsService.removeById(record.getId());
        if (!removed) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to remove the team's registration.");
        }

        ResponseEntity<UserBriefVO> creatorResp = userServiceClient.getTeamCreator(teamId);
        UserBriefVO creator = creatorResp.getBody();
        if (creator == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Team creator info not found.");
        }

        ResponseEntity<UserBriefVO> operatorResp = userServiceClient.getUserBriefById(userId);
        UserBriefVO operator = operatorResp.getBody();
        if (operator == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Operator (organizer) info not found.");
        }

        CompetitionResponseVO competition = competitionGateway.require(competitionId);

        ParticipantRemovedMessage message = new ParticipantRemovedMessage();
        message.setUserName(creator.getName());
        message.setUserEmail(creator.getEmail());
        message.setRemovedBy(operator.getName());
        message.setCompetitionName(competition.getName());
        message.setRemovedAt(LocalDateTime.now());

        registrationNotifier.sendParticipantRemoved(message);
    }

    @Override
    public Boolean existsRegistrationByTeamId(String teamId) {
        return competitionTeamsService.lambdaQuery()
                .eq(CompetitionTeams::getTeamId, teamId)
                .exists();
    }

    private static <T> T requireUserReply(ResponseEntity<T> reply, String operation) {
        if (reply == null || !reply.getStatusCode().is2xxSuccessful() || reply.getBody() == null) {
            throw new com.w16a.danish.common.exception.ServiceUnavailableException("user-service", operation);
        }
        return reply.getBody();
    }

    private boolean canReadCompetition(String competitionId, RequestContext ctx) {
        if (ctx.isAdmin()) return true;
        if (ctx.isOrganizer()) {
            return competitionOrganizersService.lambdaQuery()
                    .eq(CompetitionOrganizers::getCompetitionId, competitionId)
                    .eq(CompetitionOrganizers::getUserId, ctx.userId()).exists();
        }
        if (ctx.isJudge()) return competitionGateway.isAssignedJudge(competitionId, ctx.userId());
        return ctx.isParticipant() && (lambdaQuery()
                .eq(CompetitionParticipants::getCompetitionId, competitionId)
                .eq(CompetitionParticipants::getUserId, ctx.userId()).exists()
                || baseMapper.hasRegisteredTeamMembership(competitionId, ctx.userId()));
    }

    private void requireTeamAccess(String teamId, RequestContext ctx) {
        if (ctx.isAdmin()) return;
        UserBriefVO creator = requireUserReply(userServiceClient.getTeamCreator(teamId), "getTeamCreator");
        if (StrUtil.isBlank(creator.getId())) {
            throw new com.w16a.danish.common.exception.ServiceUnavailableException("user-service", "getTeamCreator");
        }
        if (Objects.equals(ctx.userId(), creator.getId())) return;
        if (!requireUserReply(userServiceClient.isUserInTeam(ctx.userId(), teamId), "isUserInTeam")) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not authorized to view this team's registrations");
        }
    }

    private static void requirePage(int page, int size) {
        if (page < 1 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Page must be positive and size must be between 1 and 100");
        }
    }

    private void lockCancelableRegistrations(String competitionId) {
        baseMapper.ensureLifecycleLock(competitionId);
        var awardedAt = baseMapper.lockLifecycle(competitionId);
        String status = baseMapper.competitionStatus(competitionId);
        if (status == null) throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found");
        if (awardedAt != null || !("UPCOMING".equals(status) || "ONGOING".equals(status) || "CANCELED".equals(status))) {
            throw new BusinessException(HttpStatus.CONFLICT, "Completed registrations and results are retained");
        }
    }

    private void lockOpenRegistrations(String competitionId) {
        baseMapper.ensureLifecycleLock(competitionId);
        var awardedAt = baseMapper.lockLifecycle(competitionId);
        String status = baseMapper.competitionStatus(competitionId);
        if (status == null) throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found");
        if (awardedAt != null || !("UPCOMING".equals(status) || "ONGOING".equals(status))) {
            throw new BusinessException(HttpStatus.CONFLICT, "Competition registration closed before the registration was saved");
        }
        var deadline = baseMapper.competitionEndDate(competitionId);
        if (deadline != null && !deadline.isAfter(LocalDateTime.now(java.time.ZoneOffset.UTC))) {
            throw new BusinessException(HttpStatus.CONFLICT, "Registration deadline has passed");
        }
    }
}
