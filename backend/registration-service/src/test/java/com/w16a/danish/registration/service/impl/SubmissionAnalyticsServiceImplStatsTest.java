package com.w16a.danish.registration.service.impl;

import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.w16a.danish.common.domain.vo.CompetitionResponseVO;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.registration.domain.po.SubmissionRecords;
import com.w16a.danish.registration.domain.vo.PlatformSubmissionStatisticsVO;
import com.w16a.danish.registration.domain.vo.SubmissionInfoVO;
import com.w16a.danish.registration.domain.vo.SubmissionScoreStatisticsVO;
import com.w16a.danish.registration.gateway.CompetitionGateway;
import com.w16a.danish.registration.mapper.SubmissionRecordsMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.RETURNS_DEFAULTS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reporting arithmetic.
 *
 * These numbers are read, believed and acted on — an organizer decides a competition is going well
 * because a dashboard said so. Nothing else checks them, so a wrong average or a trend that
 * silently drops a day would go unnoticed indefinitely.
 *
 * The empty and null-bearing inputs get the most attention, because that is where an average
 * divides by zero and a maximum stays null.
 */
class SubmissionAnalyticsServiceImplStatsTest {

    private SubmissionAnalyticsServiceImpl service;
    private CompetitionGateway competitionGateway;
    private LambdaQueryChainWrapper<SubmissionRecords> query;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        competitionGateway = mock(CompetitionGateway.class);

        SubmissionAnalyticsServiceImpl real = new SubmissionAnalyticsServiceImpl(competitionGateway);
        ReflectionTestUtils.setField(real, "baseMapper", mock(SubmissionRecordsMapper.class));
        service = spy(real);

        // The builder methods are overloaded and take varargs, so naming each one
        // with a matcher is both verbose and brittle. This answer says the same
        // thing once: anything that returns a chain returns this chain.
        query = mock(LambdaQueryChainWrapper.class, invocation -> {
            Class<?> returnType = invocation.getMethod().getReturnType();
            if (returnType.isInstance(invocation.getMock())) {
                return invocation.getMock();
            }
            return RETURNS_DEFAULTS.answer(invocation);
        });
        when(query.list()).thenReturn(List.of());
        doReturn(query).when(service).lambdaQuery();
    }

    private static SubmissionRecords scored(String score) {
        SubmissionRecords r = new SubmissionRecords();
        r.setTotalScore(new BigDecimal(score));
        return r;
    }

    private static SubmissionRecords createdOn(int year, int month, int day) {
        SubmissionRecords r = new SubmissionRecords();
        r.setCreatedAt(LocalDateTime.of(year, month, day, 12, 0));
        return r;
    }

    @Nested
    @DisplayName("Score statistics")
    class ScoreStats {

        @Test
        @DisplayName("No scored submissions gives empty figures, not a division by zero")
        void noScoresGivesEmptyStats() {
            when(query.list()).thenReturn(List.of());

            SubmissionScoreStatisticsVO stats = service.getScoreStatistics("c1");

            assertThat(stats.getAverageScore()).isNull();
            assertThat(stats.getHighestScore()).isNull();
            assertThat(stats.getLowestScore()).isNull();
        }

        @Test
        @DisplayName("Average is rounded to two places, half up")
        void averageIsRoundedHalfUp() {
            when(query.list()).thenReturn(List.of(scored("10"), scored("10"), scored("11")));

            SubmissionScoreStatisticsVO stats = service.getScoreStatistics("c1");

            // 31 / 3 = 10.333… → 10.33
            assertThat(stats.getAverageScore()).isEqualByComparingTo("10.33");
        }

        @Test
        @DisplayName("Highest and lowest come from the values, not from the arrival order")
        void extremesAreTheRealExtremes() {
            when(query.list()).thenReturn(List.of(scored("50"), scored("92.5"), scored("7.25")));

            SubmissionScoreStatisticsVO stats = service.getScoreStatistics("c1");

            assertThat(stats.getHighestScore()).isEqualByComparingTo("92.5");
            assertThat(stats.getLowestScore()).isEqualByComparingTo("7.25");
        }

        @Test
        @DisplayName("A single submission is both the highest and the lowest")
        void oneSubmissionIsBothExtremes() {
            when(query.list()).thenReturn(List.of(scored("42")));

            SubmissionScoreStatisticsVO stats = service.getScoreStatistics("c1");

            assertThat(stats.getHighestScore()).isEqualByComparingTo("42");
            assertThat(stats.getLowestScore()).isEqualByComparingTo("42");
            assertThat(stats.getAverageScore()).isEqualByComparingTo("42.00");
        }

        @Test
        @DisplayName("A null score is skipped by the extremes but still counted in the divisor")
        void nullScoreIsSkippedButStillCounted() {
            SubmissionRecords unscored = new SubmissionRecords();
            when(query.list()).thenReturn(List.of(scored("10"), unscored, scored("20")));

            SubmissionScoreStatisticsVO stats = service.getScoreStatistics("c1");

            assertThat(stats.getHighestScore()).isEqualByComparingTo("20");
            assertThat(stats.getLowestScore()).isEqualByComparingTo("10");
            // 30 / 3 rather than 30 / 2 — the query filters nulls out, so this only
            // matters if that filter ever changes.
            assertThat(stats.getAverageScore()).isEqualByComparingTo("10.00");
        }
    }

    @Nested
    @DisplayName("Submission trend")
    class Trend {

        @Test
        @DisplayName("A blank competition id is the caller's fault, and never reaches the gateway")
        void blankIdIsRejected() {
            assertThatThrownBy(() -> service.getSubmissionTrend("  "))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("must not be blank")
                    .extracting(e -> ((BusinessException) e).getStatus())
                    .isEqualTo(HttpStatus.BAD_REQUEST);

            verify(competitionGateway, never()).require(anyString());
        }

        @Test
        @DisplayName("Submissions are counted per day, and the days come back in order")
        void submissionsAreCountedPerDayInOrder() {
            when(competitionGateway.require("c1")).thenReturn(new CompetitionResponseVO());
            when(query.list()).thenReturn(List.of(
                    createdOn(2026, 3, 2),
                    createdOn(2026, 3, 1),
                    createdOn(2026, 3, 2)));

            Map<String, Integer> trend = service.getSubmissionTrend("c1");

            assertThat(trend).containsExactly(
                    Map.entry("2026-03-01", 1),
                    Map.entry("2026-03-02", 2));
        }

        @Test
        @DisplayName("A row with no timestamp is skipped rather than counted under a null key")
        void rowsWithoutATimestampAreSkipped() {
            when(competitionGateway.require("c1")).thenReturn(new CompetitionResponseVO());
            when(query.list()).thenReturn(List.of(createdOn(2026, 3, 1), new SubmissionRecords()));

            Map<String, Integer> trend = service.getSubmissionTrend("c1");

            assertThat(trend).containsExactly(Map.entry("2026-03-01", 1));
        }

        @Test
        @DisplayName("A competition with no submissions has an empty trend, not a missing one")
        void emptyCompetitionHasAnEmptyTrend() {
            when(competitionGateway.require("c1")).thenReturn(new CompetitionResponseVO());
            when(query.list()).thenReturn(List.of());

            assertThat(service.getSubmissionTrend("c1")).isEmpty();
        }
    }

    @Nested
    @DisplayName("Platform-wide reporting")
    class Platform {

        @Test
        @DisplayName("An empty platform reports zeroes rather than nulls")
        void emptyPlatformReportsZeroes() {
            when(query.list()).thenReturn(List.of());

            PlatformSubmissionStatisticsVO vo = service.getPlatformSubmissionStatistics();

            assertThat(vo.getTotalSubmissions()).isZero();
            assertThat(vo.getApprovedSubmissions()).isZero();
            assertThat(vo.getIndividualSubmissions()).isZero();
            assertThat(vo.getTeamSubmissions()).isZero();
        }

        @Test
        @DisplayName("Individual and team submissions are told apart by the team id")
        void individualAndTeamAreSeparated() {
            SubmissionRecords individual = new SubmissionRecords();
            individual.setReviewStatus("APPROVED");
            SubmissionRecords teamEntry = new SubmissionRecords();
            teamEntry.setTeamId("t1");
            teamEntry.setReviewStatus("PENDING");
            SubmissionRecords anotherTeamEntry = new SubmissionRecords();
            anotherTeamEntry.setTeamId("t2");
            anotherTeamEntry.setReviewStatus("approved");

            when(query.list()).thenReturn(List.of(individual, teamEntry, anotherTeamEntry));

            PlatformSubmissionStatisticsVO vo = service.getPlatformSubmissionStatistics();

            assertThat(vo.getTotalSubmissions()).isEqualTo(3);
            assertThat(vo.getIndividualSubmissions()).isEqualTo(1);
            assertThat(vo.getTeamSubmissions()).isEqualTo(2);
            // "approved" in lower case still counts — the status is compared case-insensitively.
            assertThat(vo.getApprovedSubmissions()).isEqualTo(2);
        }

        @Test
        @DisplayName("The platform trend is empty when nothing has been submitted anywhere")
        void emptyPlatformTrend() {
            when(query.list()).thenReturn(List.of());

            assertThat(service.getPlatformSubmissionTrend()).isEmpty();
        }

        @Test
        @DisplayName("The platform trend aggregates across competitions, by day")
        void platformTrendAggregatesByDay() {
            when(query.list()).thenReturn(List.of(
                    createdOn(2026, 1, 5), createdOn(2026, 1, 5), new SubmissionRecords()));

            assertThat(service.getPlatformSubmissionTrend())
                    .containsExactly(Map.entry("2026-01-05", 2));
        }
    }

    @Nested
    @DisplayName("Looking submissions up by id")
    class ById {

        @Test
        @DisplayName("An empty id list short-circuits instead of selecting everything")
        void emptyIdListShortCircuits() {
            assertThat(service.getSubmissionsByIds(List.of())).isEmpty();
            assertThat(service.getSubmissionsByIds(null)).isEmpty();

            verify(service, never()).lambdaQuery();
        }

        @Test
        @DisplayName("Found rows are mapped to the view object")
        void foundRowsAreMapped() {
            SubmissionRecords r = new SubmissionRecords();
            r.setId("s1");
            r.setTitle("Entry");
            when(query.list()).thenReturn(List.of(r));

            List<SubmissionInfoVO> result = service.getSubmissionsByIds(List.of("s1"));

            assertThat(result).singleElement()
                    .satisfies(vo -> {
                        assertThat(vo.getId()).isEqualTo("s1");
                        assertThat(vo.getTitle()).isEqualTo("Entry");
                    });
        }
    }
}
