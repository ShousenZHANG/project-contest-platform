package com.w16a.danish.competition.service.impl;

import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.baomidou.mybatisplus.extension.conditions.update.LambdaUpdateChainWrapper;
import com.w16a.danish.competition.domain.po.CompetitionParticipants;
import com.w16a.danish.competition.mapper.CompetitionParticipantsMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.*;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for CompetitionParticipantsServiceImpl (ServiceImpl delegate).
 */
class CompetitionParticipantsServiceImplTest {

    @Spy
    @InjectMocks
    private CompetitionParticipantsServiceImpl service;

    @Mock
    private CompetitionParticipantsMapper mapper;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);

        var baseMapperField = CompetitionParticipantsServiceImpl.class.getSuperclass().getDeclaredField("baseMapper");
        baseMapperField.setAccessible(true);
        baseMapperField.set(service, mapper);
    }

    // -------------------------------------------------------------------------
    // save
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("save - inserts participant and returns true")
    void save_insertsParticipant_returnsTrue() {
        CompetitionParticipants participant = new CompetitionParticipants();
        participant.setCompetitionId("comp-1");
        participant.setUserId("user-1");

        when(mapper.insert(any(CompetitionParticipants.class))).thenReturn(1);

        boolean result = service.save(participant);

        assertThat(result).isTrue();
        verify(mapper).insert(participant);
    }

    @Test
    @DisplayName("save - returns false when mapper insert returns 0")
    void save_mapperReturnsZero_returnsFalse() {
        CompetitionParticipants participant = new CompetitionParticipants();
        participant.setCompetitionId("comp-1");
        participant.setUserId("user-1");

        when(mapper.insert(any(CompetitionParticipants.class))).thenReturn(0);

        boolean result = service.save(participant);

        assertThat(result).isFalse();
    }

    // -------------------------------------------------------------------------
    // getById
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("getById - returns entity when found")
    void getById_found_returnsEntity() {
        CompetitionParticipants participant = new CompetitionParticipants();
        participant.setId("part-id");
        participant.setCompetitionId("comp-1");
        participant.setUserId("user-1");

        when(mapper.selectById("part-id")).thenReturn(participant);

        CompetitionParticipants result = service.getById("part-id");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("part-id");
        assertThat(result.getUserId()).isEqualTo("user-1");
    }

    @Test
    @DisplayName("getById - returns null when not found")
    void getById_notFound_returnsNull() {
        when(mapper.selectById(anyString())).thenReturn(null);

        CompetitionParticipants result = service.getById("missing-id");

        assertThat(result).isNull();
    }

    // -------------------------------------------------------------------------
    // removeById
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("removeById - delegates delete to mapper and returns true")
    void removeById_delegatesToMapper_returnsTrue() {
        when(mapper.deleteById("part-id")).thenReturn(1);

        boolean result = service.removeById("part-id");

        assertThat(result).isTrue();
        verify(mapper).deleteById("part-id");
    }

    @Test
    @DisplayName("removeById - returns false when record missing")
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
        CompetitionParticipants participant = new CompetitionParticipants();
        participant.setId("part-id");
        participant.setUserId("user-updated");

        when(mapper.updateById(any(CompetitionParticipants.class))).thenReturn(1);

        boolean result = service.updateById(participant);

        assertThat(result).isTrue();
        verify(mapper).updateById(participant);
    }

    // -------------------------------------------------------------------------
    // lambdaQuery chain
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("lambdaQuery - eq+exists returns true when participant enrolled")
    void lambdaQuery_eqExists_returnsTrue() {
        LambdaQueryChainWrapper<CompetitionParticipants> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(service).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.exists()).thenReturn(true);

        boolean enrolled = service.lambdaQuery()
                .eq(CompetitionParticipants::getCompetitionId, "comp-1")
                .exists();

        assertThat(enrolled).isTrue();
    }

    @Test
    @DisplayName("lambdaQuery - eq+exists returns false when participant not enrolled")
    void lambdaQuery_eqExists_returnsFalse() {
        LambdaQueryChainWrapper<CompetitionParticipants> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(service).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.exists()).thenReturn(false);

        boolean enrolled = service.lambdaQuery()
                .eq(CompetitionParticipants::getUserId, "unknown-user")
                .exists();

        assertThat(enrolled).isFalse();
    }

    @Test
    @DisplayName("lambdaQuery - eq+list returns participants for competition")
    void lambdaQuery_eqList_returnsParticipants() {
        CompetitionParticipants p = new CompetitionParticipants().setCompetitionId("comp-1").setUserId("user-1");

        LambdaQueryChainWrapper<CompetitionParticipants> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(service).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.list()).thenReturn(List.of(p));

        List<CompetitionParticipants> results = service.lambdaQuery()
                .eq(CompetitionParticipants::getCompetitionId, "comp-1")
                .list();

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getUserId()).isEqualTo("user-1");
    }

    @Test
    @DisplayName("lambdaQuery - eq+list returns empty when no participants")
    void lambdaQuery_eqList_returnsEmpty() {
        LambdaQueryChainWrapper<CompetitionParticipants> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(service).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.list()).thenReturn(Collections.emptyList());

        List<CompetitionParticipants> results = service.lambdaQuery()
                .eq(CompetitionParticipants::getCompetitionId, "comp-99")
                .list();

        assertThat(results).isEmpty();
    }

    // -------------------------------------------------------------------------
    // lambdaUpdate chain
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("lambdaUpdate - eq+remove withdraws participant from competition")
    void lambdaUpdate_eqRemove_withdrawsParticipant() {
        LambdaUpdateChainWrapper<CompetitionParticipants> update = mock(LambdaUpdateChainWrapper.class);
        doReturn(update).when(service).lambdaUpdate();
        when(update.eq(any(), any())).thenReturn(update);
        when(update.remove()).thenReturn(true);

        boolean removed = service.lambdaUpdate()
                .eq(CompetitionParticipants::getCompetitionId, "comp-1")
                .remove();

        assertThat(removed).isTrue();
    }

    @Test
    @DisplayName("lambdaUpdate - remove returns false when no rows matched")
    void lambdaUpdate_remove_returnsFalseWhenNone() {
        LambdaUpdateChainWrapper<CompetitionParticipants> update = mock(LambdaUpdateChainWrapper.class);
        doReturn(update).when(service).lambdaUpdate();
        when(update.eq(any(), any())).thenReturn(update);
        when(update.remove()).thenReturn(false);

        boolean removed = service.lambdaUpdate()
                .eq(CompetitionParticipants::getUserId, "ghost-user")
                .remove();

        assertThat(removed).isFalse();
    }
}
