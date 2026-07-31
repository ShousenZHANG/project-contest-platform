package com.w16a.danish.registration.service.impl;

import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.w16a.danish.registration.domain.po.CompetitionParticipants;
import com.w16a.danish.registration.domain.po.CompetitionTeams;
import com.w16a.danish.registration.domain.vo.PlatformParticipantStatisticsVO;
import com.w16a.danish.registration.domain.vo.RegistrationStatisticsVO;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.mapper.CompetitionParticipantsMapper;
import com.w16a.danish.registration.service.ICompetitionTeamsService;
import com.w16a.danish.registration.service.IParticipantAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;

/**
 * Reporting over registrations. Mirrors {@code SubmissionAnalyticsServiceImpl}, which already
 * separates the same concern on the submissions side.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ParticipantAnalyticsServiceImpl
        extends ServiceImpl<CompetitionParticipantsMapper, CompetitionParticipants>
        implements IParticipantAnalyticsService {

    private final CompetitionGateway competitionGateway;
    private final ICompetitionTeamsService competitionTeamsService;

    @Override
    public RegistrationStatisticsVO getRegistrationStatistics(String competitionId) {
        // Reject unknown competitions up front so a report never silently reads as "zero".
        competitionGateway.require(competitionId);

        int individualCount = Math.toIntExact(this.lambdaQuery()
                .eq(CompetitionParticipants::getCompetitionId, competitionId)
                .count());

        int teamCount = Math.toIntExact(competitionTeamsService.lambdaQuery()
                .eq(CompetitionTeams::getCompetitionId, competitionId)
                .count());

        RegistrationStatisticsVO vo = new RegistrationStatisticsVO();
        vo.setCompetitionId(competitionId);
        vo.setIndividualParticipantCount(individualCount);
        vo.setTeamParticipantCount(teamCount);
        vo.setTotalRegistrations(individualCount + teamCount);

        return vo;
    }

    @Override
    public Map<String, Map<String, Integer>> getParticipantTrend(String competitionId) {
        competitionGateway.require(competitionId);

        List<CompetitionParticipants> individualRegistrations = this.lambdaQuery()
                .eq(CompetitionParticipants::getCompetitionId, competitionId)
                .list();

        List<CompetitionTeams> teamRegistrations = competitionTeamsService.lambdaQuery()
                .eq(CompetitionTeams::getCompetitionId, competitionId)
                .list();

        return trend(individualRegistrations, teamRegistrations);
    }

    @Override
    public PlatformParticipantStatisticsVO getPlatformParticipantStatistics() {
        int individualParticipants = Math.toIntExact(
                this.lambdaQuery()
                        .isNotNull(CompetitionParticipants::getUserId)
                        .count()
        );

        int teamParticipants = competitionTeamsService.countTeamParticipants();

        PlatformParticipantStatisticsVO vo = new PlatformParticipantStatisticsVO();
        vo.setIndividualParticipants(individualParticipants);
        vo.setTeamParticipants(teamParticipants);
        vo.setTotalParticipants(individualParticipants + teamParticipants);

        return vo;
    }

    @Override
    public Map<String, Map<String, Integer>> getPlatformParticipantTrend() {
        List<CompetitionParticipants> individualRegistrations = this.lambdaQuery()
                .select(CompetitionParticipants::getCreatedAt)
                .list();

        List<CompetitionTeams> teamRegistrations = competitionTeamsService.lambdaQuery()
                .select(CompetitionTeams::getJoinedAt)
                .list();

        return trend(individualRegistrations, teamRegistrations);
    }

    /**
     * Buckets both registration kinds by calendar date.
     *
     * <p>The per-competition and platform-wide trends only differed in how the rows were selected,
     * so the bucketing is written once.
     */
    private Map<String, Map<String, Integer>> trend(List<CompetitionParticipants> individuals,
                                                    List<CompetitionTeams> teams) {
        Map<String, Map<String, Integer>> result = new HashMap<>();
        result.put("individual", countByDate(individuals, CompetitionParticipants::getCreatedAt));
        result.put("team", countByDate(teams, CompetitionTeams::getJoinedAt));
        return result;
    }

    private <T> Map<String, Integer> countByDate(List<T> rows, Function<T, LocalDateTime> timestamp) {
        Map<String, Integer> byDate = new TreeMap<>();
        for (T row : rows) {
            LocalDateTime at = timestamp.apply(row);
            if (at != null) {
                byDate.merge(at.toLocalDate().toString(), 1, Integer::sum);
            }
        }
        return byDate;
    }
}
