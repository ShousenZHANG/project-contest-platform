import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

export default function PublicLayout() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Outlet />
    </Box>
  );
}
