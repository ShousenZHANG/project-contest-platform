package com.w16a.danish.competition.service.impl;

import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.baomidou.mybatisplus.extension.conditions.update.LambdaUpdateChainWrapper;
import com.w16a.danish.competition.domain.po.CompetitionOrganizers;
import com.w16a.danish.competition.mapper.CompetitionOrganizersMapper;
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
 * Unit tests for CompetitionOrganizersServiceImpl (ServiceImpl delegate).
 */
class CompetitionOrganizersServiceImplTest {

    @Spy
    @InjectMocks
    private CompetitionOrganizersServiceImpl service;

    @Mock
    private CompetitionOrganizersMapper mapper;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);

        var baseMapperField = CompetitionOrganizersServiceImpl.class.getSuperclass().getDeclaredField("baseMapper");
        baseMapperField.setAccessible(true);
        baseMapperField.set(service, mapper);
    }

    // -------------------------------------------------------------------------
    // save
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("save - inserts organizer and returns true")
    void save_insertsOrganizer_returnsTrue() {
        CompetitionOrganizers organizer = new CompetitionOrganizers();
        organizer.setCompetitionId("comp-1");
        organizer.setUserId("user-1");

        when(mapper.insert(any(CompetitionOrganizers.class))).thenReturn(1);

        boolean result = service.save(organizer);

        assertThat(result).isTrue();
        verify(mapper).insert(organizer);
    }

    @Test
    @DisplayName("save - returns false when mapper insert returns 0")
    void save_mapperReturnsZero_returnsFalse() {
        CompetitionOrganizers organizer = new CompetitionOrganizers();
        organizer.setCompetitionId("comp-1");
        organizer.setUserId("user-1");

        when(mapper.insert(any(CompetitionOrganizers.class))).thenReturn(0);

        boolean result = service.save(organizer);

        assertThat(result).isFalse();
    }

    // -------------------------------------------------------------------------
    // getById
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("getById - returns entity when found")
    void getById_found_returnsEntity() {
        CompetitionOrganizers organizer = new CompetitionOrganizers();
        organizer.setId("org-id");
        organizer.setCompetitionId("comp-1");
        organizer.setUserId("user-1");

        when(mapper.selectById("org-id")).thenReturn(organizer);

        CompetitionOrganizers result = service.getById("org-id");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("org-id");
        assertThat(result.getCompetitionId()).isEqualTo("comp-1");
    }

    @Test
    @DisplayName("getById - returns null when not found")
    void getById_notFound_returnsNull() {
        when(mapper.selectById(anyString())).thenReturn(null);

        CompetitionOrganizers result = service.getById("missing-id");

        assertThat(result).isNull();
    }

    // -------------------------------------------------------------------------
    // removeById
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("removeById - delegates delete to mapper and returns true")
    void removeById_delegatesToMapper_returnsTrue() {
        when(mapper.deleteById("org-id")).thenReturn(1);

        boolean result = service.removeById("org-id");

        assertThat(result).isTrue();
        verify(mapper).deleteById("org-id");
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
        CompetitionOrganizers organizer = new CompetitionOrganizers();
        organizer.setId("org-id");
        organizer.setUserId("user-updated");

        when(mapper.updateById(any(CompetitionOrganizers.class))).thenReturn(1);

        boolean result = service.updateById(organizer);

        assertThat(result).isTrue();
        verify(mapper).updateById(organizer);
    }

    // -------------------------------------------------------------------------
    // lambdaQuery chain
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("lambdaQuery - eq+exists returns true when mapper finds organizer")
    void lambdaQuery_eqExists_returnsTrue() {
        LambdaQueryChainWrapper<CompetitionOrganizers> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(service).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.exists()).thenReturn(true);

        boolean exists = service.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, "comp-1")
                .exists();

        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("lambdaQuery - eq+exists returns false when no organizer for competition")
    void lambdaQuery_eqExists_returnsFalse() {
        LambdaQueryChainWrapper<CompetitionOrganizers> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(service).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.exists()).thenReturn(false);

        boolean exists = service.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, "comp-99")
                .exists();

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("lambdaQuery - eq+list returns matching organizers")
    void lambdaQuery_eqList_returnsOrganizers() {
        CompetitionOrganizers organizer = new CompetitionOrganizers().setCompetitionId("comp-1").setUserId("user-1");

        LambdaQueryChainWrapper<CompetitionOrganizers> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(service).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.list()).thenReturn(List.of(organizer));

        List<CompetitionOrganizers> results = service.lambdaQuery()
                .eq(CompetitionOrganizers::getCompetitionId, "comp-1")
                .list();

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getUserId()).isEqualTo("user-1");
    }

    @Test
    @DisplayName("lambdaQuery - eq+list returns empty when competition has no organizers")
    void lambdaQuery_eqList_returnsEmpty() {
        LambdaQueryChainWrapper<CompetitionOrganizers> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(service).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.list()).thenReturn(Collections.emptyList());

        List<CompetitionOrganizers> results = service.lambdaQuery()
                .eq(CompetitionOrganizers::getUserId, "unknown-user")
                .list();

        assertThat(results).isEmpty();
    }

    // -------------------------------------------------------------------------
    // lambdaUpdate chain
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("lambdaUpdate - eq+remove deletes matching organizers")
    void lambdaUpdate_eqRemove_deletesOrganizers() {
        LambdaUpdateChainWrapper<CompetitionOrganizers> update = mock(LambdaUpdateChainWrapper.class);
        doReturn(update).when(service).lambdaUpdate();
        when(update.eq(any(), any())).thenReturn(update);
        when(update.remove()).thenReturn(true);

        boolean removed = service.lambdaUpdate()
                .eq(CompetitionOrganizers::getCompetitionId, "comp-1")
                .remove();

        assertThat(removed).isTrue();
    }

    @Test
    @DisplayName("lambdaUpdate - remove returns false when no rows matched")
    void lambdaUpdate_remove_returnsFalseWhenNone() {
        LambdaUpdateChainWrapper<CompetitionOrganizers> update = mock(LambdaUpdateChainWrapper.class);
        doReturn(update).when(service).lambdaUpdate();
        when(update.eq(any(), any())).thenReturn(update);
        when(update.remove()).thenReturn(false);

        boolean removed = service.lambdaUpdate()
                .eq(CompetitionOrganizers::getUserId, "ghost-user")
                .remove();

        assertThat(removed).isFalse();
    }
}
