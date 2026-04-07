import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { InboxOutlined } from '@mui/icons-material';

export default function EmptyState({
  icon: Icon = InboxOutlined,
  title = 'No data yet',
  description = '',
  actionLabel,
  onAction,
}) {
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', py: 8, gap: 1.5, textAlign: 'center',
    }}>
      <Icon sx={{ fontSize: 56, color: 'text.disabled' }} />
      <Typography variant="h6" color="text.secondary">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 360 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="outlined" onClick={onAction} sx={{ mt: 1 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
