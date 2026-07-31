package com.w16a.danish.user.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.w16a.danish.user.domain.po.UserRoles;
import com.w16a.danish.user.mapper.UserRolesMapper;
import com.w16a.danish.user.service.impl.UserRolesServiceImpl;
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
 * Unit tests for {@link UserRolesServiceImpl}.
 * Covers the inherited MyBatis-Plus ServiceImpl CRUD surface.
 */
class UserRolesServiceImplTest {

    @Spy
    @InjectMocks
    private UserRolesServiceImpl userRolesService;

    @Mock
    private UserRolesMapper userRolesMapper;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(userRolesService, "baseMapper", userRolesMapper);
    }

    // === save ===

    @Test
    @DisplayName("Should save user-role mapping successfully")
    void testSave_Success() {
        UserRoles userRoles = new UserRoles().setUserId("uid-1").setRoleId(1);
        when(userRolesMapper.insert(any(UserRoles.class))).thenReturn(1);

        boolean result = userRolesService.save(userRoles);

        assertThat(result).isTrue();
        verify(userRolesMapper).insert(userRoles);
    }

    @Test
    @DisplayName("Should return false when save fails")
    void testSave_Fail() {
        UserRoles userRoles = new UserRoles().setUserId("uid-1").setRoleId(1);
        when(userRolesMapper.insert(any(UserRoles.class))).thenReturn(0);

        boolean result = userRolesService.save(userRoles);

        assertThat(result).isFalse();
    }

    // === getOne delegated via lambdaQuery ===

    @Test
    @DisplayName("Should return user-role mapping via lambdaQuery.one() when found")
    void testGetOne_Found() {
        UserRoles expected = new UserRoles().setUserId("uid-1").setRoleId(2);

        LambdaQueryChainWrapper<UserRoles> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(userRolesService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.one()).thenReturn(expected);

        UserRoles result = userRolesService.lambdaQuery()
                .eq(UserRoles::getUserId, "uid-1")
                .one();

        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo("uid-1");
        assertThat(result.getRoleId()).isEqualTo(2);
    }

    @Test
    @DisplayName("Should return null via lambdaQuery.one() when not found")
    void testGetOne_NotFound() {
        LambdaQueryChainWrapper<UserRoles> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(userRolesService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.one()).thenReturn(null);

        UserRoles result = userRolesService.lambdaQuery()
                .eq(UserRoles::getUserId, "nonexistent")
                .one();

        assertThat(result).isNull();
    }

    // === list with wrapper ===

    @Test
    @DisplayName("Should list all user-role mappings matching a wrapper")
    void testList_WithWrapper() {
        List<UserRoles> mappings = List.of(
                new UserRoles().setUserId("uid-1").setRoleId(1),
                new UserRoles().setUserId("uid-2").setRoleId(1)
        );
        when(userRolesMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(mappings);

        List<UserRoles> result = userRolesService.list(
                new LambdaQueryWrapper<UserRoles>().eq(UserRoles::getRoleId, 1)
        );

        assertThat(result).hasSize(2);
        assertThat(result).extracting(UserRoles::getRoleId).containsOnly(1);
    }

    @Test
    @DisplayName("Should return empty list when no mappings match wrapper")
    void testList_Empty() {
        when(userRolesMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        List<UserRoles> result = userRolesService.list(
                new LambdaQueryWrapper<UserRoles>().eq(UserRoles::getRoleId, 99)
        );

        assertThat(result).isEmpty();
    }

    // === remove with wrapper ===

    @Test
    @DisplayName("Should remove user-role mappings by wrapper successfully")
    void testRemove_WithWrapper_Success() {
        when(userRolesMapper.delete(any(LambdaQueryWrapper.class))).thenReturn(1);

        boolean result = userRolesService.remove(
                new LambdaQueryWrapper<UserRoles>().eq(UserRoles::getUserId, "uid-1")
        );

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Should return false when remove with wrapper deletes nothing")
    void testRemove_WithWrapper_NotFound() {
        when(userRolesMapper.delete(any(LambdaQueryWrapper.class))).thenReturn(0);

        boolean result = userRolesService.remove(
                new LambdaQueryWrapper<UserRoles>().eq(UserRoles::getUserId, "ghost")
        );

        assertThat(result).isFalse();
    }

    // === lambdaQuery ===

    @Test
    @DisplayName("Should find user-role mapping via lambdaQuery by userId")
    void testLambdaQuery_FindByUserId() {
        UserRoles expected = new UserRoles().setUserId("uid-3").setRoleId(3);

        LambdaQueryChainWrapper<UserRoles> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(userRolesService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.one()).thenReturn(expected);

        UserRoles result = userRolesService.lambdaQuery()
                .eq(UserRoles::getUserId, "uid-3")
                .one();

        assertThat(result).isNotNull();
        assertThat(result.getRoleId()).isEqualTo(3);
    }

    @Test
    @DisplayName("Should return null via lambdaQuery when no mapping found")
    void testLambdaQuery_NoMapping() {
        LambdaQueryChainWrapper<UserRoles> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(userRolesService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.one()).thenReturn(null);

        UserRoles result = userRolesService.lambdaQuery()
                .eq(UserRoles::getUserId, "unknown")
                .one();

        assertThat(result).isNull();
    }

    // === list (no wrapper) ===

    @Test
    @DisplayName("Should list all user-role mappings with no wrapper")
    void testList_All() {
        List<UserRoles> all = List.of(
                new UserRoles().setUserId("uid-1").setRoleId(1),
                new UserRoles().setUserId("uid-2").setRoleId(2)
        );
        when(userRolesMapper.selectList(any())).thenReturn(all);

        List<UserRoles> result = userRolesService.list();

        assertThat(result).hasSize(2);
    }
}
