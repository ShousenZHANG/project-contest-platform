package com.w16a.danish.judge.service.impl;

import cn.hutool.core.util.StrUtil;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.judge.notify.AwardNotifier;
import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.common.messaging.message.AwardWinnerMessage;
import com.w16a.danish.judge.domain.po.SubmissionJudgeScores;
import com.w16a.danish.judge.domain.po.SubmissionJudges;
import com.w16a.danish.judge.domain.po.SubmissionWinners;
import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.judge.domain.vo.*;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.judge.gateway.CompetitionGateway;
import com.w16a.danish.judge.feign.SubmissionServiceClient;
import com.w16a.danish.judge.feign.UserServiceClient;
import com.w16a.danish.judge.mapper.SubmissionWinnersMapper;
import com.w16a.danish.judge.mapper.SubmissionJudgesMapper;
import com.w16a.danish.judge.mapper.AwardRunMapper;
import com.w16a.danish.judge.score.ScoringPolicy;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.judge.service.ISubmissionJudgeScoresService;
import com.w16a.danish.judge.service.ISubmissionJudgesService;
import com.w16a.danish.judge.service.ISubmissionWinnersService;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
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
 * <p>
 * Table for recording awarded submissions
 * </p>
 *
 * @author Eddy
 * @since 2025-04-18
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubmissionWinnersServiceImpl extends ServiceImpl<SubmissionWinnersMapper, SubmissionWinners> implements ISubmissionWinnersService {

    private static final int LOOKUP_BATCH_SIZE = 100;

    private final CompetitionGateway competitionGateway;
    private final SubmissionServiceClient submissionServiceClient;
    private final ISubmissionJudgeScoresService submissionJudgeScoresService;
    private final ISubmissionJudgesService submissionJudgesService;
    private final UserServiceClient userServiceClient;
    private final AwardNotifier awardNotifier;
    private final SubmissionJudgesMapper judgesMapper;
    private final AwardRunMapper awardRunMapper;
    private final DurableTasks tasks;

    @Override
    public AwardEligibilityVO getAwardEligibility(RequestContext ctx, String competitionId) {
        requireOrganizer(ctx, competitionId, "view scored submissions");
        return loadEligibility(competitionGateway.require(competitionId));
    }

    @Override
    public PageResponse<ScoredSubmissionVO> listScoredSubmissions(RequestContext ctx, String competitionId,
            String keyword, String sortBy, String order, int page, int size) {
        validatePage(page, size);
        AwardEligibilityVO eligibility = getAwardEligibility(ctx, competitionId);
        Comparator<BigDecimal> scoreOrder = "asc".equalsIgnoreCase(order) ? Comparator.naturalOrder() : Comparator.reverseOrder();
        Comparator<ScoredSubmissionVO> comparator = Comparator.comparing(
                (ScoredSubmissionVO s) -> "totalScore".equals(sortBy) || StrUtil.isBlank(sortBy)
                        ? s.getTotalScore() : s.getCriterionScores().get(sortBy),
                Comparator.nullsLast(scoreOrder));
        List<ScoredSubmissionVO> sorted = eligibility.getSubmissions().stream()
                .filter(s -> StrUtil.isBlank(keyword) || StrUtil.containsIgnoreCase(s.getTitle(), keyword))
                .sorted(comparator.thenComparing(ScoredSubmissionVO::getSubmissionId)).toList();
        int from = (int) Math.min((long) (page - 1) * size, sorted.size());
        return new PageResponse<>(sorted.subList(from, Math.min(from + size, sorted.size())),
                sorted.size(), page, size, (sorted.size() + size - 1) / size);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void autoAward(RequestContext ctx, String competitionId) {
        requireOrganizer(ctx, competitionId, "auto-award submissions");
        awardRunMapper.ensureRun(competitionId);
        // Both score writes and awarding take this same transaction-held row lock.
        if (awardRunMapper.lockRun(competitionId) != null) return;
        CompetitionResponseVO competition = competitionGateway.require(competitionId);
        if (competition.getStatus() == CompetitionStatus.AWARDED) {
            // Older awarded competitions predate the run table. They remain immutable.
            awardRunMapper.markAwarded(competitionId);
            return;
        }
        AwardEligibilityVO eligibility = loadEligibility(competition);
        if (!eligibility.isCanAward()) {
            throw new BusinessException(HttpStatus.CONFLICT, String.join(" ", eligibility.getBlockers()));
        }
        if (this.lambdaQuery().eq(SubmissionWinners::getCompetitionId, competitionId).exists()) {
            throw new BusinessException(HttpStatus.CONFLICT, "Existing awards require reconciliation; they cannot be replaced.");
        }
        List<ScoredSubmissionVO> sorted = eligibility.getSubmissions().stream()
                .sorted(Comparator.comparing(ScoredSubmissionVO::getTotalScore).reversed()
                        .thenComparing(ScoredSubmissionVO::getSubmissionId)).toList();
        List<SubmissionWinners> winners = new ArrayList<>();
        BigDecimal previous = null;
        int rank = 1;
        for (int index = 0; index < sorted.size(); index++) {
            ScoredSubmissionVO submission = sorted.get(index);
            if (previous == null || submission.getTotalScore().compareTo(previous) < 0) rank = index + 1;
            if (rank > 3) break;
            String name = switch (rank) {
                case 1 -> "Champion";
                case 2 -> "Runner-up";
                default -> "Second Runner-up";
            };
            winners.add(buildWinner(competitionId, submission.getSubmissionId(), name, rank)
                    .setTotalScore(submission.getTotalScore()));
            previous = submission.getTotalScore();
        }
        for (String criterion : ScoringPolicy.criteria(competition.getScoringCriteria())) {
            BigDecimal best = sorted.stream().map(s -> s.getCriterionScores().get(criterion))
                    .max(BigDecimal::compareTo).orElseThrow();
            sorted.stream().filter(s -> s.getCriterionScores().get(criterion).compareTo(best) == 0)
                    .forEach(s -> winners.add(buildWinner(competitionId, s.getSubmissionId(), "Best in " + criterion, null)
                            .setTotalScore(s.getTotalScore())));
        }
        if (!this.saveBatch(winners) || awardRunMapper.markAwarded(competitionId) != 1) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to persist the award result.");
        }
        List<SubmissionInfoVO> submissions = requireApprovedList(competition);
        tasks.enqueue("COMPETITION_AWARDED", competitionId, null, Map.of());
        submissions.stream().filter(s -> winners.stream().anyMatch(w -> w.getSubmissionId().equals(s.getId())))
                .forEach(s -> sendAwardNotification(s, competition, winners));
    }

    private AwardEligibilityVO loadEligibility(CompetitionResponseVO competition) {
        List<String> criteria = ScoringPolicy.criteria(competition.getScoringCriteria());
        List<SubmissionInfoVO> submissions = requireApprovedList(competition);
        List<String> ids = submissions.stream().map(SubmissionInfoVO::getId).toList();
        List<SubmissionJudges> records = ids.isEmpty() ? List.of() : submissionJudgesService.lambdaQuery()
                .eq(SubmissionJudges::getCompetitionId, competition.getId()).in(SubmissionJudges::getSubmissionId, ids).list();
        List<SubmissionJudgeScores> details = ids.isEmpty() ? List.of() : submissionJudgeScoresService.listBySubmissionIds(ids);
        Set<String> validJudges = Optional.ofNullable(judgesMapper.selectValidJudgeIds(competition.getId())).orElse(Set.of());
        List<ScoredSubmissionVO> rows = new ArrayList<>();
        for (SubmissionInfoVO submission : submissions) {
            ScoringPolicy.Summary summary = ScoringPolicy.summarize(competition.getId(), submission.getId(), submission.getRevision(),
                    criteria, records, details, validJudges);
            ScoredSubmissionVO row = new ScoredSubmissionVO();
            row.setSubmissionId(submission.getId());
            row.setTitle(submission.getTitle());
            row.setReviewStatus(submission.getReviewStatus());
            row.setJudgeCount(summary.judgeCount());
            row.setMinimumJudgeCount(ScoringPolicy.MINIMUM_JUDGE_COUNT);
            row.setTotalScore(summary.totalScore());
            row.setCriterionScores(summary.criterionScores());
            row.setEligible(summary.judgeCount() >= ScoringPolicy.MINIMUM_JUDGE_COUNT);
            row.setIsWinner(false);
            row.setBlockers(row.isEligible() ? List.of()
                    : List.of("Needs at least 3 valid assigned Judges; currently " + summary.judgeCount() + "."));
            rows.add(row);
        }
        List<String> blockers = new ArrayList<>();
        if (competition.getStatus() != CompetitionStatus.COMPLETED) blockers.add("Competition must be COMPLETED before awarding.");
        if (awardRunMapper.awardedAt(competition.getId()) != null) blockers.add("Awards have already been finalized.");
        if (rows.isEmpty()) blockers.add("No approved submissions are available for awarding.");
        int eligible = (int) rows.stream().filter(ScoredSubmissionVO::isEligible).count();
        if (eligible < rows.size()) blockers.add("Every approved submission needs at least 3 valid assigned Judges.");
        AwardEligibilityVO result = new AwardEligibilityVO();
        result.setCompetitionId(competition.getId());
        result.setStatus(competition.getStatus().name());
        result.setIsPublic(Boolean.TRUE.equals(competition.getIsPublic()));
        result.setMinimumJudgeCount(ScoringPolicy.MINIMUM_JUDGE_COUNT);
        result.setApprovedCount(rows.size());
        result.setEligibleCount(eligible);
        result.setSubmissions(rows);
        result.setBlockers(List.copyOf(blockers));
        result.setCanAward(blockers.isEmpty());
        return result;
    }

    private List<SubmissionInfoVO> requireApprovedList(CompetitionResponseVO competition) {
        var response = submissionServiceClient.getApprovedSubmissions(competition.getId());
        if (response == null || response.getBody() == null) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Submission service returned no approved-submission data.");
        }
        Set<String> ids = new HashSet<>();
        for (SubmissionInfoVO submission : response.getBody()) {
            if (submission == null || StrUtil.isBlank(submission.getId()) || !ids.add(submission.getId())) {
                throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Submission service returned invalid approved-submission data.");
            }
            ScoringPolicy.requireApprovedSubmission(competition, submission);
        }
        return response.getBody();
    }

    private void requireOrganizer(RequestContext ctx, String competitionId, String action) {
        boolean permittedRole = ctx.isAdmin() || ctx.isOrganizer();
        if (!permittedRole || (!ctx.isAdmin() && !competitionGateway.isOrganiser(competitionId, ctx.userId()))) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only organizers or admins can " + action + ".");
        }
    }

    private void validatePage(int page, int size) {
        if (page < 1 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Page must be positive and size between 1 and 100.");
        }
    }


    @Override
    public PageResponse<WinnerInfoVO> listPublicWinners(String competitionId, int page, int size) {
        validatePage(page, size);
        CompetitionResponseVO competition = competitionGateway.require(competitionId);
        if (!Boolean.TRUE.equals(competition.getIsPublic())) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found.");
        }
        return loadPublishedWinners(competition, page, size);
    }

    @Override
    public PageResponse<WinnerInfoVO> listManagedWinners(RequestContext ctx, String competitionId, int page, int size) {
        validatePage(page, size);
        requireOrganizer(ctx, competitionId, "view competition winners");
        return loadPublishedWinners(competitionGateway.require(competitionId), page, size);
    }

    private PageResponse<WinnerInfoVO> loadPublishedWinners(CompetitionResponseVO competition, int page, int size) {
        String competitionId = competition.getId();
        if (competition.getStatus() != CompetitionStatus.AWARDED) {
            return new PageResponse<>(List.of(), 0, page, size, 0);
        }
        List<SubmissionWinners> winners = this.lambdaQuery()
                .eq(SubmissionWinners::getCompetitionId, competitionId)
                .list();

        if (winners.isEmpty()) {
            return new PageResponse<>(List.of(), 0, page, size, 0);
        }

        Map<String, List<SubmissionWinners>> winnersGroupedBySubmission = winners.stream()
                .collect(Collectors.groupingBy(SubmissionWinners::getSubmissionId));

        List<String> submissionIds = winnersGroupedBySubmission.keySet().stream().sorted().toList();
        List<SubmissionInfoVO> submissions = new ArrayList<>();
        Set<String> received = new HashSet<>();
        for (int from = 0; from < submissionIds.size(); from += LOOKUP_BATCH_SIZE) {
            List<String> batch = submissionIds.subList(from, Math.min(from + LOOKUP_BATCH_SIZE, submissionIds.size()));
            for (SubmissionInfoVO submission : requireBody(submissionServiceClient.getSubmissionsByIds(batch), "submission lookup")) {
                if (submission == null || !batch.contains(submission.getId()) || !received.add(submission.getId())) {
                    throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Submission service returned invalid result metadata.");
                }
                // Historical winner rows must not make rejected or unrelated private work public.
                if (!Objects.equals(competitionId, submission.getCompetitionId())
                        || !"APPROVED".equals(submission.getReviewStatus())) continue;
                ScoringPolicy.requireApprovedSubmission(competition, submission);
                submissions.add(submission);
            }
        }

        if (submissions.isEmpty()) {
            return new PageResponse<>(List.of(), 0, page, size, 0);
        }

        Set<String> userIds = new HashSet<>();
        Set<String> teamIds = new HashSet<>();

        for (SubmissionInfoVO submission : submissions) {
            if (StrUtil.isNotBlank(submission.getUserId())) {
                userIds.add(submission.getUserId());
            }
            if (StrUtil.isNotBlank(submission.getTeamId())) {
                teamIds.add(submission.getTeamId());
            }
        }

        Map<String, String> userNameMap = new HashMap<>();
        List<String> authors = userIds.stream().sorted().toList();
        for (int from = 0; from < authors.size(); from += LOOKUP_BATCH_SIZE) {
            List<String> batch = authors.subList(from, Math.min(from + LOOKUP_BATCH_SIZE, authors.size()));
            for (UserBriefVO user : requireBody(userServiceClient.getUsersByIds(batch, null), "author lookup")) {
                if (user == null || !batch.contains(user.getId())) {
                    throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "User service returned invalid result metadata.");
                }
                if (StrUtil.isNotBlank(user.getName())) userNameMap.put(user.getId(), user.getName());
            }
        }
        Map<String, String> teamNameMap = new HashMap<>();
        List<String> teams = teamIds.stream().sorted().toList();
        for (int from = 0; from < teams.size(); from += LOOKUP_BATCH_SIZE) {
            List<String> batch = teams.subList(from, Math.min(from + LOOKUP_BATCH_SIZE, teams.size()));
            for (TeamInfoVO team : requireBody(userServiceClient.getTeamBriefByIds(batch), "team lookup")) {
                if (team == null || !batch.contains(team.getTeamId())) {
                    throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "User service returned invalid team metadata.");
                }
                if (StrUtil.isNotBlank(team.getTeamName())) teamNameMap.put(team.getTeamId(), team.getTeamName());
            }
        }

        List<WinnerInfoVO> voList = submissions.stream()
                .map(submission -> {
                    WinnerInfoVO vo = new WinnerInfoVO();
                    vo.setSubmissionId(submission.getId());
                    vo.setTitle(submission.getTitle());
                    vo.setAwards(winnersGroupedBySubmission.getOrDefault(submission.getId(), List.of())
                            .stream()
                            .map(SubmissionWinners::getAwardName)
                            .distinct()
                            .toList());
                    vo.setTotalScore(winnersGroupedBySubmission.get(submission.getId()).stream()
                            .map(SubmissionWinners::getTotalScore).filter(Objects::nonNull).findFirst().orElse(null));
                    vo.setIsTeamSubmission(StrUtil.isNotBlank(submission.getTeamId()));
                    vo.setSubmittedAt(submission.getCreatedAt());

                    if (vo.getIsTeamSubmission()) {
                        vo.setSubmitterName(teamNameMap.getOrDefault(submission.getTeamId(), "Unknown Team"));
                    } else {
                        vo.setSubmitterName(userNameMap.getOrDefault(submission.getUserId(), "Unknown User"));
                    }

                    return vo;
                })
                .sorted(Comparator.comparing(WinnerInfoVO::getTotalScore, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(WinnerInfoVO::getSubmissionId))
                .toList();

        int total = voList.size();
        int fromIndex = (int) Math.min((long) (page - 1) * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        List<WinnerInfoVO> pagedList = fromIndex >= total ? List.of() : voList.subList(fromIndex, toIndex);

        return new PageResponse<>(pagedList, total, page, size, (int) Math.ceil((double) total / size));
    }

    private static <T> T requireBody(ResponseEntity<T> response, String operation) {
        if (response == null || !response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Dependency returned no data for " + operation + ".");
        }
        return response.getBody();
    }

    private SubmissionWinners buildWinner(String competitionId, String submissionId, String awardName, Integer rank) {
        return new SubmissionWinners()
                .setId(StrUtil.uuid())
                .setCompetitionId(competitionId)
                .setSubmissionId(submissionId)
                .setAwardName(awardName)
                .setRankSubmission(rank)
                .setAwardDescription(null);
    }

    private void sendAwardNotification(SubmissionInfoVO submission, CompetitionResponseVO competition, List<SubmissionWinners> winners) {

        List<UserBriefVO> recipients = new ArrayList<>();

        if (StrUtil.isNotBlank(submission.getTeamId())) {
            recipients = requireBody(userServiceClient.getTeamMembersByTeamId(submission.getTeamId()), "award recipients");
        } else if (StrUtil.isNotBlank(submission.getUserId())) {
            UserBriefVO user = requireBody(userServiceClient.getUserBriefById(submission.getUserId()), "award recipient");
            if (!Objects.equals(user.getId(), submission.getUserId())) {
                throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "User service returned invalid award recipient data.");
            }
            recipients = List.of(user);
        }

        if (recipients.isEmpty()) {
            return;
        }

        List<String> awardNames = winners.stream()
                .filter(w -> w.getSubmissionId().equals(submission.getId()))
                .map(SubmissionWinners::getAwardName)
                .toList();

        if (awardNames.isEmpty()) {
            return;
        }

        String awards = String.join(", ", awardNames);

        for (UserBriefVO recipient : recipients) {
            AwardWinnerMessage message = new AwardWinnerMessage();
            message.setUserName(recipient.getName());
            message.setUserEmail(recipient.getEmail());
            message.setCompetitionName(competition.getName());
            message.setAwardedAt(LocalDateTime.now());
            message.setAwardName(awards);

            awardNotifier.sendAwardWinner(message);
        }
    }

}
