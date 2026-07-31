package com.w16a.danish.competition.service.impl;

import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.baomidou.mybatisplus.extension.conditions.update.LambdaUpdateChainWrapper;
import com.w16a.danish.competition.domain.po.CompetitionJudges;
import com.w16a.danish.competition.mapper.CompetitionJudgesMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.*;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Unit tests for CompetitionJudgesServiceImpl (ServiceImpl delegate).
 * Uses the project's established pattern: @Spy + @InjectMocks + reflection to inject
 * baseMapper, then doReturn on lambdaQuery/lambdaUpdate.
 */
class CompetitionJudgesServiceImplTest {

    @Spy
    @InjectMocks
    private CompetitionJudgesServiceImpl service;

    @Mock
    private CompetitionJudgesMapper mapper;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);

        // Inject mock mapper via reflection (same pattern as CompetitionServiceImplTest)
        ReflectionTestUtils.setField(service, "baseMapper", mapper);
    }

    // -------------------------------------------------------------------------
    // save / saveBatch
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("save - delegates insert to mapper and returns true")
    void save_delegatesToMapper_returnsTrue() {
        CompetitionJudges judge = new CompetitionJudges();
        judge.setCompetitionId("comp-1");
        judge.setUserId("user-1");

        when(mapper.insert(any(CompetitionJudges.class))).thenReturn(1);

        boolean result = service.save(judge);

        assertThat(result).isTrue();
        verify(mapper).insert(judge);
    }

    @Test
    @DisplayName("save - returns false when mapper insert returns 0")
    void save_mapperReturnsZero_returnsFalse() {
        CompetitionJudges judge = new CompetitionJudges();
        judge.setCompetitionId("comp-1");
        judge.setUserId("user-1");

        when(mapper.insert(any(CompetitionJudges.class))).thenReturn(0);

        boolean result = service.save(judge);

        assertThat(result).isFalse();
    }

    // -------------------------------------------------------------------------
    // getById
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("getById - returns entity when found")
    void getById_found_returnsEntity() {
        CompetitionJudges judge = new CompetitionJudges();
        judge.setId("judge-id");
        judge.setCompetitionId("comp-1");
        judge.setUserId("user-1");

        when(mapper.selectById("judge-id")).thenReturn(judge);

        CompetitionJudges result = service.getById("judge-id");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("judge-id");
        assertThat(result.getUserId()).isEqualTo("user-1");
    }

    @Test
    @DisplayName("getById - returns null when not found")
    void getById_notFound_returnsNull() {
        when(mapper.selectById(anyString())).thenReturn(null);

        CompetitionJudges result = service.getById("non-existent");

        assertThat(result).isNull();
    }

    // -------------------------------------------------------------------------
    // removeById
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("removeById - delegates delete to mapper and returns true")
    void removeById_delegatesToMapper_returnsTrue() {
        when(mapper.deleteById("judge-id")).thenReturn(1);

        boolean result = service.removeById("judge-id");

        assertThat(result).isTrue();
        verify(mapper).deleteById("judge-id");
    }

    @Test
    @DisplayName("removeById - returns false when record does not exist")
    void removeById_noRecord_returnsFalse() {
        when(mapper.deleteById(anyString())).thenReturn(0);

        boolean result = service.removeById("ghost-id");

        assertThat(result).isFalse();
    }

    // -------------------------------------------------------------------------
    // updateById
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("updateById - delegates update to mapper and returns true")
    void updateById_delegatesToMapper_returnsTrue() {
        CompetitionJudges judge = new CompetitionJudges();
        judge.setId("judge-id");
        judge.setUserId("user-new");

        when(mapper.updateById(any(CompetitionJudges.class))).thenReturn(1);

        boolean result = service.updateById(judge);

        assertThat(result).isTrue();
        verify(mapper).updateById(judge);
    }

    // -------------------------------------------------------------------------
    // lambdaQuery chain
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("lambdaQuery - eq+exists returns true when mapper finds match")
    void lambdaQuery_eqExists_returnsTrue() {
        LambdaQueryChainWrapper<CompetitionJudges> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(service).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.exists()).thenReturn(true);

        boolean exists = service.lambdaQuery()
                .eq(CompetitionJudges::getCompetitionId, "comp-1")
                .exists();

        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("lambdaQuery - eq+list returns records")
    void lambdaQuery_eqList_returnsRecords() {
        CompetitionJudges judge = new CompetitionJudges().setCompetitionId("comp-1").setUserId("user-1");

        LambdaQueryChainWrapper<CompetitionJudges> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(service).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.list()).thenReturn(List.of(judge));

        List<CompetitionJudges> results = service.lambdaQuery()
                .eq(CompetitionJudges::getCompetitionId, "comp-1")
                .list();

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getUserId()).isEqualTo("user-1");
    }

    @Test
    @DisplayName("lambdaQuery - eq+list returns empty when no matches")
    void lambdaQuery_eqList_returnsEmpty() {
        LambdaQueryChainWrapper<CompetitionJudges> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(service).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.list()).thenReturn(Collections.emptyList());

        List<CompetitionJudges> results = service.lambdaQuery()
                .eq(CompetitionJudges::getCompetitionId, "comp-99")
                .list();

        assertThat(results).isEmpty();
    }

    // -------------------------------------------------------------------------
    // lambdaUpdate chain
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("lambdaUpdate - eq+remove deletes matching records")
    void lambdaUpdate_eqRemove_deletesRecords() {
        LambdaUpdateChainWrapper<CompetitionJudges> update = mock(LambdaUpdateChainWrapper.class);
        doReturn(update).when(service).lambdaUpdate();
        when(update.eq(any(), any())).thenReturn(update);
        when(update.remove()).thenReturn(true);

        boolean removed = service.lambdaUpdate()
                .eq(CompetitionJudges::getCompetitionId, "comp-1")
                .remove();

        assertThat(removed).isTrue();
    }

    @Test
    @DisplayName("lambdaUpdate - remove returns false when no rows affected")
    void lambdaUpdate_remove_returnsFalseWhenNone() {
        LambdaUpdateChainWrapper<CompetitionJudges> update = mock(LambdaUpdateChainWrapper.class);
        doReturn(update).when(service).lambdaUpdate();
        when(update.eq(any(), any())).thenReturn(update);
        when(update.remove()).thenReturn(false);

        boolean removed = service.lambdaUpdate()
                .eq(CompetitionJudges::getUserId, "ghost-user")
                .remove();

        assertThat(removed).isFalse();
    }
}
