import React from 'react';
import { Paper, Typography, Button, Box } from '@mui/material';

export default function EmptyState({ title, description, actionLabel, onAction, icon }) {
  return (
    <Paper sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center', bgcolor: '#fafafa', borderRadius: 2 }}>
      {icon && <Box sx={{ mb: 2 }}>{icon}</Box>}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" size="small" onClick={onAction} sx={{ borderRadius: 2 }}>
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
}
