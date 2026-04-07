import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, NavLink, Outlet } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, Avatar,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Button, Divider, useMediaQuery, useTheme, Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  EmojiEvents as ContestIcon,
  Group as TeamIcon,
  Folder as ProjectIcon,
  Star as RatingIcon,
  ManageAccounts as ManageIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../theme/ThemeProvider';
import { layout } from '../theme/tokens';
import apiClient from '../api/apiClient';

const NAV_CONFIG = {
  Admin: [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/AdminDashboard' },
    { label: 'Profile', icon: <PersonIcon />, path: '/AdminProfile' },
    { label: 'Accounts', icon: <ManageIcon />, path: '/AdminAccountManage' },
    { label: 'Competitions', icon: <ContestIcon />, path: '/AllCompetitions' },
  ],
  Organizer: [
    { label: 'Dashboard', icon: <DashboardIcon />, pathFn: (e) => `/OrganizerDashboard/${e}` },
    { label: 'Profile', icon: <PersonIcon />, pathFn: (e) => `/OrganizerProfile/${e}` },
    { label: 'Contests', icon: <ContestIcon />, pathFn: (e) => `/OrganizerContestList/${e}` },
  ],
  Participant: [
    { label: 'Profile', icon: <PersonIcon />, pathFn: (e) => `/profile/${e}` },
    { label: 'Contest', icon: <ContestIcon />, pathFn: (e) => `/contest/${e}` },
    { label: 'Team', icon: <TeamIcon />, pathFn: (e) => `/teams/${e}` },
    { label: 'Project', icon: <ProjectIcon />, pathFn: (e) => `/project/${e}` },
    { label: 'Rating', icon: <RatingIcon />, pathFn: (e) => `/rating/${e}` },
  ],
};

export default function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();

  const email = user?.email || '';
  const role = user?.role || '';
  const navItems = NAV_CONFIG[role] || [];

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const res = await apiClient.get('/users/profile');
        if (res.data?.avatarUrl) setAvatarUrl(res.data.avatarUrl);
      } catch { /* ignore */ }
    };
    if (user) fetchAvatar();
  }, [user]);

  const handleLogout = useCallback(async () => {
    try {
      await apiClient.post('/users/logout');
    } catch { /* ignore */ }
    logout();
    setLogoutOpen(false);
    navigate('/');
  }, [logout, navigate]);

  const getPath = (item) => item.path || (item.pathFn ? item.pathFn(email) : '/');

  const drawerWidth = collapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ justifyContent: collapsed ? 'center' : 'space-between', px: collapsed ? 1 : 2 }}>
        {!collapsed && (
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: 'primary.main' }}>
            Questora
          </Typography>
        )}
        {!isMobile && (
          <IconButton onClick={() => setCollapsed(!collapsed)} size="small">
            <ChevronLeftIcon sx={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, px: 1, py: 1 }}>
        {navItems.map((item) => {
          const path = getPath(item);
          const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
          return (
            <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={collapsed ? item.label : ''} placement="right">
                <ListItemButton
                  component={NavLink}
                  to={path}
                  onClick={() => isMobile && setMobileOpen(false)}
                  sx={{
                    borderRadius: 2,
                    px: collapsed ? 1.5 : 2,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    bgcolor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? 'primary.contrastText' : 'text.primary',
                    '&:hover': {
                      bgcolor: isActive ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon sx={{
                    minWidth: collapsed ? 0 : 40,
                    color: isActive ? 'primary.contrastText' : 'text.secondary',
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: isActive ? 600 : 400 }} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        <ListItem disablePadding>
          <Tooltip title={collapsed ? 'Logout' : ''} placement="right">
            <ListItemButton onClick={() => setLogoutOpen(true)} sx={{ borderRadius: 2, px: collapsed ? 1.5 : 2, justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, color: 'error.main' }}>
                <LogoutIcon />
              </ListItemIcon>
              {!collapsed && <ListItemText primary="Logout" sx={{ color: 'error.main' }} />}
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: layout.sidebarWidth } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              transition: 'width 0.2s ease',
              overflowX: 'hidden',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* TopBar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ gap: 2 }}>
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)} edge="start">
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" noWrap>
                Welcome back{email ? `, ${email.split('@')[0]}` : ''}!
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {role}
              </Typography>
            </Box>
            <IconButton onClick={toggleTheme} size="small">
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
            <Avatar
              src={avatarUrl || undefined}
              sx={{ width: 36, height: 36, cursor: 'pointer', bgcolor: 'primary.main' }}
              onClick={() => {
                const profilePath = navItems.find(i => i.label === 'Profile');
                if (profilePath) navigate(getPath(profilePath));
              }}
            >
              {email ? email[0].toUpperCase() : '?'}
            </Avatar>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box component="main" sx={{ flex: 1, p: { xs: 2, sm: 3 }, maxWidth: layout.maxContentWidth, width: '100%', mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>

      {/* Logout dialog */}
      <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <DialogTitle>Log out</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to log out?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutOpen(false)}>Cancel</Button>
          <Button onClick={handleLogout} color="error" variant="contained">Log out</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
