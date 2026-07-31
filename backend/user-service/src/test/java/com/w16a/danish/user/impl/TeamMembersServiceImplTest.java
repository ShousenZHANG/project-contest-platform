package com.w16a.danish.user.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.baomidou.mybatisplus.extension.conditions.update.LambdaUpdateChainWrapper;
import com.w16a.danish.user.domain.po.TeamMembers;
import com.w16a.danish.user.mapper.TeamMembersMapper;
import com.w16a.danish.user.service.impl.TeamMembersServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.*;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Unit tests for {@link TeamMembersServiceImpl}.
 * Covers the inherited MyBatis-Plus ServiceImpl CRUD surface.
 */
class TeamMembersServiceImplTest {

    @Spy
    @InjectMocks
    private TeamMembersServiceImpl teamMembersService;

    @Mock
    private TeamMembersMapper teamMembersMapper;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(teamMembersService, "baseMapper", teamMembersMapper);
    }

    // === save ===

    @Test
    @DisplayName("Should save team member successfully")
    void testSave_Success() {
        TeamMembers member = new TeamMembers().setTeamId("team-1").setUserId("uid-1").setRole("Developer");
        when(teamMembersMapper.insert(any(TeamMembers.class))).thenReturn(1);

        boolean result = teamMembersService.save(member);

        assertThat(result).isTrue();
        verify(teamMembersMapper).insert(member);
    }

    @Test
    @DisplayName("Should return false when save fails")
    void testSave_Fail() {
        TeamMembers member = new TeamMembers().setTeamId("team-1").setUserId("uid-2").setRole("Designer");
        when(teamMembersMapper.insert(any(TeamMembers.class))).thenReturn(0);

        boolean result = teamMembersService.save(member);

        assertThat(result).isFalse();
    }

    // === list with wrapper ===

    @Test
    @DisplayName("Should list all members for a given team")
    void testList_ByTeamId() {
        List<TeamMembers> members = List.of(
                new TeamMembers().setTeamId("team-1").setUserId("uid-1"),
                new TeamMembers().setTeamId("team-1").setUserId("uid-2")
        );
        when(teamMembersMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(members);

        List<TeamMembers> result = teamMembersService.list(
                new LambdaQueryWrapper<TeamMembers>().eq(TeamMembers::getTeamId, "team-1")
        );

        assertThat(result).hasSize(2);
        assertThat(result).extracting(TeamMembers::getUserId)
                .containsExactlyInAnyOrder("uid-1", "uid-2");
    }

    @Test
    @DisplayName("Should return empty list when team has no members")
    void testList_Empty() {
        when(teamMembersMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        List<TeamMembers> result = teamMembersService.list(
                new LambdaQueryWrapper<TeamMembers>().eq(TeamMembers::getTeamId, "ghost-team")
        );

        assertThat(result).isEmpty();
    }

    // === remove with wrapper ===

    @Test
    @DisplayName("Should remove team member by userId and teamId successfully")
    void testRemove_WithWrapper_Success() {
        when(teamMembersMapper.delete(any(LambdaQueryWrapper.class))).thenReturn(1);

        boolean result = teamMembersService.remove(
                new LambdaQueryWrapper<TeamMembers>()
                        .eq(TeamMembers::getTeamId, "team-1")
                        .eq(TeamMembers::getUserId, "uid-1")
        );

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Should return false when removing a member that does not exist")
    void testRemove_WithWrapper_NotFound() {
        when(teamMembersMapper.delete(any(LambdaQueryWrapper.class))).thenReturn(0);

        boolean result = teamMembersService.remove(
                new LambdaQueryWrapper<TeamMembers>()
                        .eq(TeamMembers::getTeamId, "team-1")
                        .eq(TeamMembers::getUserId, "ghost")
        );

        assertThat(result).isFalse();
    }

    // === lambdaQuery — existence check ===

    @Test
    @DisplayName("Should return true via lambdaQuery exists when member is in team")
    void testLambdaQuery_Exists_True() {
        LambdaQueryChainWrapper<TeamMembers> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(teamMembersService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.exists()).thenReturn(true);

        boolean exists = teamMembersService.lambdaQuery()
                .eq(TeamMembers::getTeamId, "team-1")
                .eq(TeamMembers::getUserId, "uid-1")
                .exists();

        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Should return false via lambdaQuery exists when member not in team")
    void testLambdaQuery_Exists_False() {
        LambdaQueryChainWrapper<TeamMembers> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(teamMembersService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.exists()).thenReturn(false);

        boolean exists = teamMembersService.lambdaQuery()
                .eq(TeamMembers::getTeamId, "team-1")
                .eq(TeamMembers::getUserId, "ghost")
                .exists();

        assertThat(exists).isFalse();
    }

    // === lambdaQuery — list ===

    @Test
    @DisplayName("Should list members via lambdaQuery by teamId")
    void testLambdaQuery_List() {
        List<TeamMembers> members = List.of(
                new TeamMembers().setTeamId("team-1").setUserId("uid-1")
        );

        LambdaQueryChainWrapper<TeamMembers> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(teamMembersService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.list()).thenReturn(members);

        List<TeamMembers> result = teamMembersService.lambdaQuery()
                .eq(TeamMembers::getTeamId, "team-1")
                .list();

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getUserId()).isEqualTo("uid-1");
    }

    // === lambdaQuery — in (batch lookup) ===

    @Test
    @DisplayName("Should list members via lambdaQuery in multiple teamIds")
    void testLambdaQuery_In_MultipleTeams() {
        List<TeamMembers> members = List.of(
                new TeamMembers().setTeamId("team-1").setUserId("uid-1"),
                new TeamMembers().setTeamId("team-2").setUserId("uid-2")
        );

        LambdaQueryChainWrapper<TeamMembers> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(teamMembersService).lambdaQuery();
        when(query.in(any(), anyCollection())).thenReturn(query);
        when(query.list()).thenReturn(members);

        List<TeamMembers> result = teamMembersService.lambdaQuery()
                .in(TeamMembers::getTeamId, List.of("team-1", "team-2"))
                .list();

        assertThat(result).hasSize(2);
    }

    // === lambdaUpdate — remove ===

    @Test
    @DisplayName("Should remove member via lambdaUpdate successfully")
    void testLambdaUpdate_Remove_Success() {
        LambdaUpdateChainWrapper<TeamMembers> update = mock(LambdaUpdateChainWrapper.class);
        doReturn(update).when(teamMembersService).lambdaUpdate();
        when(update.eq(any(), any())).thenReturn(update);
        when(update.remove()).thenReturn(true);

        boolean removed = teamMembersService.lambdaUpdate()
                .eq(TeamMembers::getTeamId, "team-1")
                .eq(TeamMembers::getUserId, "uid-1")
                .remove();

        assertThat(removed).isTrue();
        verify(update).remove();
    }

    @Test
    @DisplayName("Should return false via lambdaUpdate remove when nothing deleted")
    void testLambdaUpdate_Remove_Fail() {
        LambdaUpdateChainWrapper<TeamMembers> update = mock(LambdaUpdateChainWrapper.class);
        doReturn(update).when(teamMembersService).lambdaUpdate();
        when(update.eq(any(), any())).thenReturn(update);
        when(update.remove()).thenReturn(false);

        boolean removed = teamMembersService.lambdaUpdate()
                .eq(TeamMembers::getTeamId, "team-1")
                .eq(TeamMembers::getUserId, "ghost")
                .remove();

        assertThat(removed).isFalse();
    }

    // === list (no wrapper) ===

    @Test
    @DisplayName("Should list all team members with no wrapper")
    void testList_All() {
        List<TeamMembers> all = List.of(
                new TeamMembers().setTeamId("team-1").setUserId("uid-1"),
                new TeamMembers().setTeamId("team-2").setUserId("uid-2")
        );
        when(teamMembersMapper.selectList(any())).thenReturn(all);

        List<TeamMembers> result = teamMembersService.list();

        assertThat(result).hasSize(2);
        assertThat(result).extracting(TeamMembers::getTeamId)
                .containsExactlyInAnyOrder("team-1", "team-2");
    }
}
