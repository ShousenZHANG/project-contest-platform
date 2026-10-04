package com.w16a.danish.judge.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.w16a.danish.common.context.RequestContext;
import com.w16a.danish.judge.domain.dto.SubmissionJudgeDTO;
import com.w16a.danish.judge.domain.dto.CriterionScoreDTO;
import com.w16a.danish.common.domain.enums.CompetitionStatus;
import com.w16a.danish.judge.domain.po.CompetitionJudges;
import com.w16a.danish.judge.domain.po.SubmissionJudgeScores;
import com.w16a.danish.judge.domain.po.SubmissionJudges;
import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.judge.domain.vo.*;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.judge.gateway.CompetitionGateway;
import com.w16a.danish.judge.feign.SubmissionServiceClient;
import com.w16a.danish.judge.mapper.SubmissionJudgesMapper;
import com.w16a.danish.judge.mapper.AwardRunMapper;
import com.w16a.danish.judge.score.ScoringPolicy;
import com.w16a.danish.common.recovery.DurableTasks;
import com.w16a.danish.judge.service.ICompetitionJudgesService;
import com.w16a.danish.judge.service.ISubmissionJudgeScoresService;
import com.w16a.danish.judge.service.ISubmissionJudgesService;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.Map;
import java.util.Objects;
import java.util.Comparator;
import java.util.HashSet;
import lombok.extern.slf4j.Slf4j;

/**
 * <p>
 * Judge records for submissions
 * </p>
 *
 * @author Eddy
 * @since 2025-04-18
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubmissionJudgesServiceImpl extends ServiceImpl<SubmissionJudgesMapper, SubmissionJudges> implements ISubmissionJudgesService {

    private final ICompetitionJudgesService competitionJudgesService;
    private final ISubmissionJudgeScoresService submissionJudgeScoresService;
    private final CompetitionGateway competitionGateway;
    private final SubmissionServiceClient submissionServiceClient;
    private final AwardRunMapper awardRunMapper;
    private final DurableTasks tasks;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void judgeSubmission(RequestContext ctx, SubmissionJudgeDTO judgeDTO) {
        CompetitionResponseVO competition = lockScoringCompetition(ctx, judgeDTO.getCompetitionId());
        SubmissionInfoVO submission = requireApprovedSubmission(competition, judgeDTO.getSubmissionId());
        BigDecimal totalScore = ScoringPolicy.judgeMean(competition.getScoringCriteria(), judgeDTO.getScores());
        SubmissionJudges record = this.lambdaQuery().eq(SubmissionJudges::getSubmissionId, judgeDTO.getSubmissionId())
                .eq(SubmissionJudges::getJudgeId, ctx.userId()).one();
        if (ScoringPolicy.isCompleteCurrentScore(record, submission.getRevision(), competition.getScoringCriteria(),
                submissionJudgeScoresService.listBySubmissionIds(List.of(submission.getId())))) {
            throw new BusinessException(HttpStatus.CONFLICT, "You have already judged this submission.");
        }
        if (record == null) {
            record = new SubmissionJudges().setId(IdUtil.fastUUID()).setCompetitionId(competition.getId())
                    .setSubmissionId(judgeDTO.getSubmissionId()).setJudgeId(ctx.userId());
            applyScore(record, submission, judgeDTO, totalScore);
            if (!this.save(record)) {
                throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save judge record.");
            }
        } else {
            if (!Objects.equals(competition.getId(), record.getCompetitionId())) {
                throw new BusinessException(HttpStatus.CONFLICT, "Judging record belongs to a different competition.");
            }
            // Preserve the unique (submission, Judge) identity while replacing stale evaluations.
            applyScore(record, submission, judgeDTO, totalScore);
            replaceScoreRecord(record);
        }
        saveCriterionScores(record, judgeDTO, competition);
        recalculateAndUpdateSubmissionTotalScore(submission, competition);
    }

    @Override
    public boolean isUserAssignedAsJudge(String userId, String competitionId) {
        CompetitionResponseVO competition = competitionGateway.require(competitionId);
        return CompetitionStatus.COMPLETED.equals(competition.getStatus())
                && awardRunMapper.awardedAt(competitionId) == null
                && validJudgeIds(competitionId).contains(userId);
    }

    @Override
    public JudgingSubmissionVO getJudgingSubmission(RequestContext ctx, String competitionId, String submissionId) {
        CompetitionResponseVO competition = requireAssignedCompetition(ctx, competitionId, true);
        SubmissionInfoVO submission = requireApprovedSubmission(competition, submissionId);
        JudgingSubmissionVO vo = new JudgingSubmissionVO();
        vo.setId(submissionId);
        vo.setCompetitionId(competitionId);
        vo.setCompetitionStatus(competition.getStatus().name());
        vo.setRevision(submission.getRevision());
        vo.setTitle(submission.getTitle());
        vo.setDescription(submission.getDescription());
        vo.setFileName(submission.getFileName());
        vo.setFileUrl(submission.getFileUrl());
        vo.setFileType(submission.getFileType());
        vo.setReviewStatus(submission.getReviewStatus());
        vo.setScoringCriteria(ScoringPolicy.criteria(competition.getScoringCriteria()));
        SubmissionJudges record = this.lambdaQuery().eq(SubmissionJudges::getSubmissionId, submissionId)
                .eq(SubmissionJudges::getJudgeId, ctx.userId()).one();
        vo.setHasScored(ScoringPolicy.isCompleteCurrentScore(record, submission.getRevision(), competition.getScoringCriteria(),
                submissionJudgeScoresService.listBySubmissionIds(List.of(submissionId))));
        vo.setRequiresRescore(record != null && !vo.isHasScored());
        vo.setCanScore(competition.getStatus() == CompetitionStatus.COMPLETED
                && awardRunMapper.awardedAt(competitionId) == null);
        return vo;
    }

    @Override
    public PageResponse<SubmissionBriefVO> listPendingSubmissionsForJudging(
            RequestContext ctx, String competitionId, String keyword, String sortOrder, int page, int size) {

        validatePage(page, size);
        CompetitionResponseVO competition = requireAssignedCompetition(ctx, competitionId, true);

        // Assigned Judges can read private competitions through the service-only contract.
        var approvedResponse = submissionServiceClient.getApprovedSubmissions(competitionId);
        if (approvedResponse == null || approvedResponse.getBody() == null) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Submission service returned no data.");
        }
        Set<String> ids = new HashSet<>();
        for (SubmissionInfoVO submission : approvedResponse.getBody()) {
            if (submission == null || StrUtil.isBlank(submission.getId()) || !ids.add(submission.getId())) {
                throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Submission service returned invalid approved-submission data.");
            }
            ScoringPolicy.requireApprovedSubmission(competition, submission);
        }
        Comparator<LocalDateTime> dates = "asc".equalsIgnoreCase(sortOrder) ? Comparator.naturalOrder() : Comparator.reverseOrder();
        List<SubmissionInfoVO> sorted = approvedResponse.getBody().stream()
                .filter(s -> StrUtil.isBlank(keyword) || StrUtil.containsIgnoreCase(s.getTitle(), keyword))
                .sorted(Comparator.comparing(SubmissionInfoVO::getCreatedAt, Comparator.nullsLast(dates))
                        .thenComparing(SubmissionInfoVO::getId)).toList();
        int from = (int) Math.min((long) (page - 1) * size, sorted.size());
        List<SubmissionInfoVO> pageItems = sorted.subList(from, Math.min(from + size, sorted.size()));

        List<SubmissionJudges> judgedRecords = this.lambdaQuery()
                .eq(SubmissionJudges::getJudgeId, ctx.userId())
                .eq(SubmissionJudges::getCompetitionId, competitionId)
                .list();
        List<SubmissionJudgeScores> scoreDetails = pageItems.isEmpty() ? List.of()
                : submissionJudgeScoresService.listBySubmissionIds(pageItems.stream().map(SubmissionInfoVO::getId).toList());
        List<SubmissionBriefVO> resultList = pageItems.stream()
                .map(submission -> {
                    SubmissionBriefVO vo = new SubmissionBriefVO();
                    vo.setId(submission.getId());
                    vo.setTitle(submission.getTitle());
                    vo.setDescription(submission.getDescription());
                    vo.setFileName(submission.getFileName());
                    vo.setFileUrl(submission.getFileUrl());
                    vo.setLastUpdatedAt(submission.getCreatedAt() != null ? submission.getCreatedAt().toString() : null);
                    vo.setHasScored(judgedRecords.stream().anyMatch(record ->
                            Objects.equals(record.getSubmissionId(), submission.getId())
                                    && ScoringPolicy.isCompleteCurrentScore(record, submission.getRevision(),
                                    competition.getScoringCriteria(), scoreDetails)));
                    return vo;
                })
                .toList();

        // Step 5: Return paginated response
        return PageResponse.<SubmissionBriefVO>builder()
                .data(resultList)
                .page(page)
                .size(size)
                .total((long) sorted.size())
                .pages((sorted.size() + size - 1) / size)
                .build();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateJudgement(RequestContext ctx, String submissionId, SubmissionJudgeDTO judgeDTO) {
        ctx.requireAnyRole("JUDGE");
        if (!Objects.equals(submissionId, judgeDTO.getSubmissionId())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Path and body submission IDs must match.");
        }
        CompetitionResponseVO competition = lockScoringCompetition(ctx, judgeDTO.getCompetitionId());
        SubmissionInfoVO submission = requireApprovedSubmission(competition, submissionId);
        BigDecimal total = ScoringPolicy.judgeMean(competition.getScoringCriteria(), judgeDTO.getScores());
        SubmissionJudges existing = this.lambdaQuery().eq(SubmissionJudges::getSubmissionId, submissionId)
                .eq(SubmissionJudges::getJudgeId, ctx.userId()).one();
        if (existing == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "No existing judging record found for this submission.");
        }
        if (!Objects.equals(competition.getId(), existing.getCompetitionId())) {
            throw new BusinessException(HttpStatus.CONFLICT, "Judging record belongs to a different competition.");
        }
        applyScore(existing, submission, judgeDTO, total);
        replaceScoreRecord(existing);
        saveCriterionScores(existing, judgeDTO, competition);
        recalculateAndUpdateSubmissionTotalScore(submission, competition);
    }

    @Override
    @Transactional(readOnly = true)
    public SubmissionJudgeVO getMyJudgingDetail(String judgeId, String submissionId) {
        // Step 1: Query the judge's scoring record for the submission
        SubmissionJudges judgeRecord = this.lambdaQuery()
                .eq(SubmissionJudges::getJudgeId, judgeId)
                .eq(SubmissionJudges::getSubmissionId, submissionId)
                .one();

        if (judgeRecord == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "No judging record found for this submission by the current judge.");
        }

        CompetitionResponseVO competition = requireAssignedCompetition(new RequestContext(judgeId, "JUDGE"),
                judgeRecord.getCompetitionId(), true);
        SubmissionInfoVO submission = requireApprovedSubmission(competition, submissionId);

        // Step 2: Query all detailed criterion scores
        List<SubmissionJudgeScores> scoreDetails = submissionJudgeScoresService.lambdaQuery()
                .eq(SubmissionJudgeScores::getJudgeRecordId, judgeRecord.getId())
                .list();

        // Step 3: Map to VO
        SubmissionJudgeVO vo = new SubmissionJudgeVO();
        vo.setSubmissionId(judgeRecord.getSubmissionId());
        vo.setCompetitionId(judgeRecord.getCompetitionId());
        vo.setJudgeId(judgeRecord.getJudgeId());
        vo.setSubmissionRevision(judgeRecord.getSubmissionRevision());
        vo.setScoreSchemaVersion(judgeRecord.getScoreSchemaVersion());
        vo.setRequiresRescore(!ScoringPolicy.isCompleteCurrentScore(judgeRecord, submission.getRevision(),
                competition.getScoringCriteria(), scoreDetails));
        vo.setJudgeComments(judgeRecord.getJudgeComments());
        vo.setTotalScore(vo.isRequiresRescore() ? null : ScoringPolicy.judgeMean(competition.getScoringCriteria(), scoreDetails.stream().map(detail -> {
            CriterionScoreDTO dto = new CriterionScoreDTO();
            dto.setCriterion(detail.getCriterion());
            dto.setScore(detail.getScore());
            return dto;
        }).toList()));
        vo.setCreatedAt(judgeRecord.getCreatedAt());
        vo.setUpdatedAt(judgeRecord.getUpdatedAt());

        List<SubmissionJudgeVO.CriterionScoreVO> scoreVOList = scoreDetails.stream()
                .map(detail -> {
                    SubmissionJudgeVO.CriterionScoreVO scoreVO = new SubmissionJudgeVO.CriterionScoreVO();
                    scoreVO.setCriterion(detail.getCriterion());
                    scoreVO.setScore(detail.getScore());
                    scoreVO.setWeight(vo.isRequiresRescore() ? null : ScoringPolicy.equalWeight(competition.getScoringCriteria().size()));
                    return scoreVO;
                })
                .toList();

        vo.setScores(scoreVOList);

        return vo;
    }

    @Override
    public PageResponse<CompetitionResponseVO> listMyJudgingCompetitions(
            RequestContext ctx, String keyword, String sortBy, String order, int page, int size) {

        ctx.requireAnyRole("JUDGE");
        validatePage(page, size);
        // Step 1: Find all competitionIds where user is assigned as judge
        List<String> competitionIds = competitionJudgesService.lambdaQuery()
                .eq(CompetitionJudges::getUserId, ctx.userId())
                .select(CompetitionJudges::getCompetitionId)
                .list()
                .stream()
                .map(CompetitionJudges::getCompetitionId)
                .distinct()
                .toList();

        if (competitionIds.isEmpty()) {
            return PageResponse.<CompetitionResponseVO>builder()
                    .data(List.of())
                    .page(page)
                    .size(size)
                    .pages(0)
                    .total(0L)
                    .build();
        }

        // Step 2: Fetch competition details
        List<CompetitionResponseVO> competitions = competitionGateway.findAll(competitionIds);

        if (competitions.isEmpty()) {
            return PageResponse.<CompetitionResponseVO>builder()
                    .data(List.of())
                    .page(page)
                    .size(size)
                    .pages(0)
                    .total(0L)
                    .build();
        }

        // Step 3: Keyword filtering if necessary
        List<CompetitionResponseVO> filtered = competitions.stream()
                .filter(c -> validJudgeIds(c.getId()).contains(ctx.userId()))
                .filter(c -> StrUtil.isBlank(keyword) || StrUtil.containsIgnoreCase(c.getName(), keyword))
                .toList();

        // Step 4: Sorting (createdAt or endDate)
        List<CompetitionResponseVO> sorted = filtered.stream()
                .sorted((c1, c2) -> {
                    if ("endDate".equalsIgnoreCase(sortBy)) {
                        LocalDateTime e1 = c1.getEndDate();
                        LocalDateTime e2 = c2.getEndDate();
                        if (e1 == null && e2 == null) {
                            return 0;
                        }
                        if (e1 == null) {
                            return 1;
                        }
                        if (e2 == null) {
                            return -1;
                        }
                        return "asc".equalsIgnoreCase(order) ? e1.compareTo(e2) : e2.compareTo(e1);
                    } else { // default: createdAt
                        LocalDateTime c1Created = c1.getCreatedAt();
                        LocalDateTime c2Created = c2.getCreatedAt();
                        if (c1Created == null && c2Created == null) {
                            return 0;
                        }
                        if (c1Created == null) {
                            return 1;
                        }
                        if (c2Created == null) {
                            return -1;
                        }
                        return "asc".equalsIgnoreCase(order) ? c1Created.compareTo(c2Created) : c2Created.compareTo(c1Created);
                    }
                })
                .toList();

        // Step 5: Manual pagination
        int fromIndex = (int) Math.min((long) (page - 1) * size, sorted.size());
        int toIndex = Math.min(fromIndex + size, sorted.size());

        List<CompetitionResponseVO> paginated;
        if (fromIndex >= sorted.size()) {
            paginated = List.of();
        } else {
            paginated = sorted.subList(fromIndex, toIndex);
        }

        // Step 6: Return paginated response
        return PageResponse.<CompetitionResponseVO>builder()
                .data(paginated)
                .page(page)
                .size(size)
                .total((long) sorted.size())
                .pages((sorted.size() + size - 1) / size)
                .build();
    }

    private CompetitionResponseVO lockScoringCompetition(RequestContext ctx, String competitionId) {
        ctx.requireAnyRole("JUDGE");
        awardRunMapper.ensureRun(competitionId);
        if (awardRunMapper.lockRun(competitionId) != null) {
            throw new BusinessException(HttpStatus.CONFLICT, "Awards have been finalized. Scores are immutable.");
        }
        return requireAssignedCompetition(ctx, competitionId, false);
    }

    private CompetitionResponseVO requireAssignedCompetition(RequestContext ctx, String competitionId, boolean readOnly) {
        ctx.requireAnyRole("JUDGE");
        CompetitionResponseVO competition = competitionGateway.require(competitionId);
        boolean allowed = competition.getStatus() == CompetitionStatus.COMPLETED
                || (readOnly && competition.getStatus() == CompetitionStatus.AWARDED);
        if (!allowed) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Competition is not completed yet. Judging is not allowed.");
        }
        if (!validJudgeIds(competitionId).contains(ctx.userId())) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You are not assigned as a judge for this competition.");
        }
        return competition;
    }

    private Set<String> validJudgeIds(String competitionId) {
        Set<String> ids = baseMapper.selectValidJudgeIds(competitionId);
        return ids == null ? Set.of() : ids;
    }

    private SubmissionInfoVO requireApprovedSubmission(CompetitionResponseVO competition, String submissionId) {
        var response = submissionServiceClient.getSubmissionsByIds(List.of(submissionId));
        if (response == null || response.getBody() == null) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Submission service returned no data.");
        }
        SubmissionInfoVO submission = response.getBody().stream().filter(s -> Objects.equals(submissionId, s.getId()))
                .findFirst().orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Submission not found."));
        ScoringPolicy.requireApprovedSubmission(competition, submission);
        return submission;
    }

    private void saveCriterionScores(SubmissionJudges record, SubmissionJudgeDTO dto, CompetitionResponseVO competition) {
        BigDecimal weight = ScoringPolicy.equalWeight(competition.getScoringCriteria().size());
        List<SubmissionJudgeScores> details = dto.getScores().stream().map(item -> new SubmissionJudgeScores()
                .setId(IdUtil.fastUUID()).setJudgeRecordId(record.getId()).setSubmissionId(record.getSubmissionId())
                .setCriterion(item.getCriterion()).setScore(item.getScore()).setWeight(weight)).toList();
        if (!submissionJudgeScoresService.saveBatch(details)) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save judge score details.");
        }
    }

    private void applyScore(SubmissionJudges record, SubmissionInfoVO submission, SubmissionJudgeDTO dto, BigDecimal total) {
        record.setSubmissionRevision(submission.getRevision()).setScoreSchemaVersion(ScoringPolicy.SCORE_SCHEMA_VERSION)
                .setJudgeComments(dto.getJudgeComments()).setTotalScore(total).setUpdatedAt(LocalDateTime.now());
    }

    private void replaceScoreRecord(SubmissionJudges record) {
        if (!this.updateById(record)) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update judging record.");
        }
        // A historical record may have no criterion rows; deleting zero rows is still successful.
        submissionJudgeScoresService.remove(new LambdaQueryWrapper<SubmissionJudgeScores>()
                .eq(SubmissionJudgeScores::getJudgeRecordId, record.getId()));
    }

    private void recalculateAndUpdateSubmissionTotalScore(SubmissionInfoVO submission, CompetitionResponseVO competition) {
        String submissionId = submission.getId();
        List<SubmissionJudges> records = this.lambdaQuery().eq(SubmissionJudges::getCompetitionId, competition.getId())
                .eq(SubmissionJudges::getSubmissionId, submissionId).list();
        List<SubmissionJudgeScores> details = submissionJudgeScoresService.listBySubmissionIds(List.of(submissionId));
        ScoringPolicy.Summary summary = ScoringPolicy.summarize(competition.getId(), submissionId, submission.getRevision(),
                competition.getScoringCriteria(), records, details, validJudgeIds(competition.getId()));
        if (summary.judgeCount() == 0) {
            throw new BusinessException(HttpStatus.CONFLICT, "No valid Judge scores found to calculate average.");
        }
        if (awardRunMapper.incrementScoreVersion(competition.getId()) != 1) {
            throw new BusinessException(HttpStatus.CONFLICT, "Score synchronization version could not be advanced.");
        }
        long scoreVersion = awardRunMapper.scoreVersion(competition.getId());
        BigDecimal finalScore = summary.totalScore();
        tasks.enqueue("SUBMISSION_SCORE", submissionId, scoreVersion,
                Map.of("score", finalScore, "revision", submission.getRevision()));
    }

    private void validatePage(int page, int size) {
        if (page < 1 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Page must be positive and size between 1 and 100.");
        }
    }


}
