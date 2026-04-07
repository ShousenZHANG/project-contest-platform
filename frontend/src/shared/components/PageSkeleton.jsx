import React from 'react';
import { Box, Skeleton } from '@mui/material';

export default function PageSkeleton({ rows = 5 }) {
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Skeleton variant="text" width="40%" height={40} />
      <Skeleton variant="text" width="60%" height={24} />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" width="33%" height={120} />
        ))}
      </Box>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={48} />
      ))}
    </Box>
  );
}
