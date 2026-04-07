package com.w16a.danish.registration.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.domain.vo.*;
import com.w16a.danish.registration.feign.CompetitionServiceClient;
import com.w16a.danish.registration.mapper.SubmissionRecordsMapper;
import com.w16a.danish.registration.service.ISubmissionAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Read-only analytics for submission data.
 * Handles all statistics, trend, and reporting queries extracted from
 * the former {@code SubmissionRecordsServiceImpl} God Service.
 *
 * @author Eddy ZHANG
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubmissionAnalyticsServiceImpl
        extends ServiceImpl<SubmissionRecordsMapper, SubmissionRecords>
        implements ISubmissionAnalyticsService {

    private final CompetitionServiceClient competitionServiceClient;

    @Override
    public SubmissionStatisticsVO getSubmissionStatistics(String competitionId) {
        if (StrUtil.isBlank(competitionId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Competition ID must not be blank.");
        }

        long total = this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .count();
        long approved = this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getReviewStatus, "APPROVED").count();
        long pending = this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getReviewStatus, "PENDING").count();
        long rejected = this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getReviewStatus, "REJECTED").count();

        SubmissionStatisticsVO vo = new SubmissionStatisticsVO();
        vo.setTotalSubmissions((int) total);
        vo.setApprovedSubmissions((int) approved);
        vo.setPendingSubmissions((int) pending);
        vo.setRejectedSubmissions((int) rejected);
        return vo;
    }

    @Override
    public Map<String, Integer> getSubmissionTrend(String competitionId) {
        if (StrUtil.isBlank(competitionId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Competition ID must not be blank.");
        }

        var competition = competitionServiceClient.getCompetitionById(competitionId).getBody();
        if (competition == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "Competition not found.");
        }

        List<SubmissionRecords> submissions = this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .select(SubmissionRecords::getCreatedAt)
                .list();

        Map<String, Integer> trend = new TreeMap<>();
        for (SubmissionRecords r : submissions) {
            if (r.getCreatedAt() != null) {
                String date = r.getCreatedAt().toLocalDate().toString();
                trend.merge(date, 1, Integer::sum);
            }
        }
        return trend;
    }

    @Override
    public PlatformSubmissionStatisticsVO getPlatformSubmissionStatistics() {
        List<SubmissionRecords> all = this.lambdaQuery()
                .select(SubmissionRecords::getId, SubmissionRecords::getReviewStatus, SubmissionRecords::getTeamId)
                .list();

        PlatformSubmissionStatisticsVO vo = new PlatformSubmissionStatisticsVO();
        if (CollUtil.isEmpty(all)) {
            vo.setTotalSubmissions(0);
            vo.setApprovedSubmissions(0);
            vo.setIndividualSubmissions(0);
            vo.setTeamSubmissions(0);
            return vo;
        }

        int total = all.size();
        int approved = 0;
        int individual = 0;
        int team = 0;
        for (SubmissionRecords r : all) {
            if ("APPROVED".equalsIgnoreCase(r.getReviewStatus())) approved++;
            if (StrUtil.isBlank(r.getTeamId())) individual++;
            else team++;
        }

        vo.setTotalSubmissions(total);
        vo.setApprovedSubmissions(approved);
        vo.setIndividualSubmissions(individual);
        vo.setTeamSubmissions(team);
        return vo;
    }

    @Override
    public Map<String, Integer> getPlatformSubmissionTrend() {
        List<SubmissionRecords> all = this.lambdaQuery()
                .select(SubmissionRecords::getCreatedAt)
                .list();

        if (CollUtil.isEmpty(all)) {
            return Collections.emptyMap();
        }

        Map<String, Integer> trend = new TreeMap<>();
        for (SubmissionRecords r : all) {
            if (r.getCreatedAt() != null) {
                String date = r.getCreatedAt().toLocalDate().toString();
                trend.merge(date, 1, Integer::sum);
            }
        }
        return trend;
    }

    @Override
    public SubmissionScoreStatisticsVO getScoreStatistics(String competitionId) {
        List<SubmissionRecords> scored = this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .eq(SubmissionRecords::getReviewStatus, "APPROVED")
                .isNotNull(SubmissionRecords::getTotalScore)
                .select(SubmissionRecords::getTotalScore)
                .list();

        SubmissionScoreStatisticsVO stats = new SubmissionScoreStatisticsVO();
        if (scored.isEmpty()) {
            return stats;
        }

        BigDecimal sum = BigDecimal.ZERO;
        BigDecimal max = null;
        BigDecimal min = null;
        for (SubmissionRecords r : scored) {
            BigDecimal s = r.getTotalScore();
            if (s == null) continue;
            sum = sum.add(s);
            if (max == null || s.compareTo(max) > 0) max = s;
            if (min == null || s.compareTo(min) < 0) min = s;
        }
        stats.setAverageScore(sum.divide(BigDecimal.valueOf(scored.size()), 2, RoundingMode.HALF_UP));
        stats.setHighestScore(max);
        stats.setLowestScore(min);
        return stats;
    }

    @Override
    public List<SubmissionInfoVO> getScoredSubmissions(String competitionId) {
        return this.lambdaQuery()
                .eq(SubmissionRecords::getCompetitionId, competitionId)
                .isNotNull(SubmissionRecords::getTotalScore)
                .list()
                .stream()
                .map(this::toVO)
                .toList();
    }

    @Override
    public List<SubmissionInfoVO> getSubmissionsByIds(List<String> submissionIds) {
        if (CollUtil.isEmpty(submissionIds)) {
            return List.of();
        }
        return this.lambdaQuery()
                .in(SubmissionRecords::getId, submissionIds)
                .list()
                .stream()
                .map(this::toVO)
                .toList();
    }

    private SubmissionInfoVO toVO(SubmissionRecords r) {
        SubmissionInfoVO vo = new SubmissionInfoVO();
        vo.setId(r.getId());
        vo.setCompetitionId(r.getCompetitionId());
        vo.setUserId(r.getUserId());
        vo.setTeamId(r.getTeamId());
        vo.setTitle(r.getTitle());
        vo.setDescription(r.getDescription());
        vo.setFileName(r.getFileName());
        vo.setFileUrl(r.getFileUrl());
        vo.setFileType(r.getFileType());
        vo.setReviewStatus(r.getReviewStatus());
        vo.setReviewComments(r.getReviewComments());
        vo.setReviewedBy(r.getReviewedBy());
        vo.setReviewedAt(r.getReviewedAt());
        vo.setTotalScore(r.getTotalScore());
        vo.setCreatedAt(r.getCreatedAt());
        return vo;
    }
}
