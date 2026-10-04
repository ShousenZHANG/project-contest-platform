package com.w16a.danish.judge.service.impl;

import com.w16a.danish.judge.mapper.CompetitionJudgesMapper;
import com.w16a.danish.judge.mapper.SubmissionJudgesMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.Spy;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link CompetitionJudgesServiceImpl}.
 */
class CompetitionJudgesServiceImplTest {

    @InjectMocks
    @Spy
    private CompetitionJudgesServiceImpl competitionJudgesService;

    @Mock
    private CompetitionJudgesMapper competitionJudgesMapper;

    @Mock
    private SubmissionJudgesMapper submissionJudgesMapper;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(competitionJudgesService, "baseMapper", competitionJudgesMapper);
    }

    @Test
    @DisplayName("✅ Should return correct judge count when judges exist")
    void testCountJudgesByCompetitionId_WithJudges() {
        // Arrange
        String competitionId = "comp-001";
        when(submissionJudgesMapper.selectValidJudgeIds(competitionId)).thenReturn(Set.of("j1", "j2", "j3"));

        // Act
        int judgeCount = competitionJudgesService.countJudgesByCompetitionId(competitionId);

        // Assert
        assertThat(judgeCount).isEqualTo(3);
    }

    @Test
    @DisplayName("✅ Should return 0 when no judges assigned")
    void testCountJudgesByCompetitionId_NoJudges() {
        // Arrange
        String competitionId = "comp-002";
        when(submissionJudgesMapper.selectValidJudgeIds(competitionId)).thenReturn(Set.of());

        // Act
        int judgeCount = competitionJudgesService.countJudgesByCompetitionId(competitionId);

        // Assert
        assertThat(judgeCount).isEqualTo(0);
    }
}
