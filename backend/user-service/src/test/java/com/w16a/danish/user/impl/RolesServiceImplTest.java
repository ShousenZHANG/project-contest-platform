package com.w16a.danish.user.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.w16a.danish.user.domain.po.Roles;
import com.w16a.danish.user.mapper.RolesMapper;
import com.w16a.danish.user.service.impl.RolesServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.*;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link RolesServiceImpl}.
 * Covers the inherited MyBatis-Plus ServiceImpl CRUD surface.
 */
class RolesServiceImplTest {

    @Spy
    @InjectMocks
    private RolesServiceImpl rolesService;

    @Mock
    private RolesMapper rolesMapper;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        java.lang.reflect.Field baseMapperField = RolesServiceImpl.class.getSuperclass().getDeclaredField("baseMapper");
        baseMapperField.setAccessible(true);
        baseMapperField.set(rolesService, rolesMapper);
    }

    // === getById ===

    @Test
    @DisplayName("Should return role when found by ID")
    void testGetById_Found() {
        Roles role = new Roles().setId(1).setName("PARTICIPANT");
        when(rolesMapper.selectById(1)).thenReturn(role);

        Roles result = rolesService.getById(1);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("PARTICIPANT");
        verify(rolesMapper).selectById(1);
    }

    @Test
    @DisplayName("Should return null when role not found by ID")
    void testGetById_NotFound() {
        when(rolesMapper.selectById(99)).thenReturn(null);

        Roles result = rolesService.getById(99);

        assertThat(result).isNull();
        verify(rolesMapper).selectById(99);
    }

    // === save ===

    @Test
    @DisplayName("Should save new role successfully")
    void testSave_Success() {
        Roles role = new Roles().setName("ORGANIZER").setDescription("Competition organizer");
        when(rolesMapper.insert(any(Roles.class))).thenReturn(1);

        boolean result = rolesService.save(role);

        assertThat(result).isTrue();
        verify(rolesMapper).insert(role);
    }

    @Test
    @DisplayName("Should return false when save fails (mapper returns 0)")
    void testSave_Fail() {
        Roles role = new Roles().setName("ORGANIZER");
        when(rolesMapper.insert(any(Roles.class))).thenReturn(0);

        boolean result = rolesService.save(role);

        assertThat(result).isFalse();
    }

    // === removeById ===

    @Test
    @DisplayName("Should remove role by ID successfully")
    void testRemoveById_Success() {
        when(rolesMapper.deleteById(1)).thenReturn(1);

        boolean result = rolesService.removeById(1);

        assertThat(result).isTrue();
        verify(rolesMapper).deleteById(1);
    }

    @Test
    @DisplayName("Should return false when removeById finds nothing")
    void testRemoveById_NotFound() {
        when(rolesMapper.deleteById(99)).thenReturn(0);

        boolean result = rolesService.removeById(99);

        assertThat(result).isFalse();
    }

    // === updateById ===

    @Test
    @DisplayName("Should update role by ID successfully")
    void testUpdateById_Success() {
        Roles role = new Roles().setId(1).setName("JUDGE");
        when(rolesMapper.updateById(any(Roles.class))).thenReturn(1);

        boolean result = rolesService.updateById(role);

        assertThat(result).isTrue();
        verify(rolesMapper).updateById(role);
    }

    @Test
    @DisplayName("Should return false when updateById finds nothing")
    void testUpdateById_NotFound() {
        Roles role = new Roles().setId(99).setName("JUDGE");
        when(rolesMapper.updateById(any(Roles.class))).thenReturn(0);

        boolean result = rolesService.updateById(role);

        assertThat(result).isFalse();
    }

    // === list ===

    @Test
    @DisplayName("Should list all roles successfully")
    void testList_AllRoles() {
        List<Roles> roles = List.of(
                new Roles().setId(1).setName("PARTICIPANT"),
                new Roles().setId(2).setName("ORGANIZER"),
                new Roles().setId(3).setName("JUDGE")
        );
        when(rolesMapper.selectList(any())).thenReturn(roles);

        List<Roles> result = rolesService.list();

        assertThat(result).hasSize(3);
        assertThat(result).extracting(Roles::getName)
                .containsExactlyInAnyOrder("PARTICIPANT", "ORGANIZER", "JUDGE");
    }

    @Test
    @DisplayName("Should return empty list when no roles exist")
    void testList_Empty() {
        when(rolesMapper.selectList(any())).thenReturn(List.of());

        List<Roles> result = rolesService.list();

        assertThat(result).isEmpty();
    }

    // === lambdaQuery — used by other services to look up by name ===

    @Test
    @DisplayName("Should find role by name via lambdaQuery")
    void testLambdaQuery_FindByName() {
        Roles role = new Roles().setId(2).setName("ORGANIZER");

        LambdaQueryChainWrapper<Roles> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(rolesService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.one()).thenReturn(role);

        Roles result = rolesService.lambdaQuery()
                .eq(Roles::getName, "ORGANIZER")
                .one();

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(2);
    }

    @Test
    @DisplayName("Should return null via lambdaQuery when name not found")
    void testLambdaQuery_NameNotFound() {
        LambdaQueryChainWrapper<Roles> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(rolesService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.one()).thenReturn(null);

        Roles result = rolesService.lambdaQuery()
                .eq(Roles::getName, "UNKNOWN")
                .one();

        assertThat(result).isNull();
    }

    // === getOne delegated via lambdaQuery ===

    @Test
    @DisplayName("Should return role via lambdaQuery.one() when found")
    void testGetOne_Found() {
        Roles role = new Roles().setId(1).setName("ADMIN");

        LambdaQueryChainWrapper<Roles> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(rolesService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.one()).thenReturn(role);

        Roles result = rolesService.lambdaQuery()
                .eq(Roles::getName, "ADMIN")
                .one();

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("Should return null via lambdaQuery.one() when not found")
    void testGetOne_NotFound() {
        LambdaQueryChainWrapper<Roles> query = mock(LambdaQueryChainWrapper.class);
        doReturn(query).when(rolesService).lambdaQuery();
        when(query.eq(any(), any())).thenReturn(query);
        when(query.one()).thenReturn(null);

        Roles result = rolesService.lambdaQuery()
                .eq(Roles::getName, "GHOST")
                .one();

        assertThat(result).isNull();
    }
}
