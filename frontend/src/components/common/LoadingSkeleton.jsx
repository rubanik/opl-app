import React from 'react';
import { Box, Card, CardContent, Skeleton } from '@mui/material';

export function ListSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={50} height={24} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={50} height={24} sx={{ borderRadius: 1 }} />
            </Box>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export function DetailSkeleton() {
  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, mt: 2 }}>
      <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 2 }} />
      {[0, 1].map((i) => (
        <Card key={i} sx={{ borderRadius: 2, mb: 2 }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="text" width="70%" height={24} />
            </Box>
            <Skeleton variant="rectangular" width="100%" height={160} sx={{ borderRadius: 2 }} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
