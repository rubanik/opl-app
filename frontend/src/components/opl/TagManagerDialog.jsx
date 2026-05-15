import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const API = '/api';

export default function TagManagerDialog({ open, onClose, onUpdate }) {
  const [tags, setTags] = useState([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#1976d2');
  const [confirm, setConfirm] = useState({ open: false, tagId: null });

  useEffect(() => {
    if (open) {
      fetch(`${API}/opls/tags`).then(r => r.json()).then(setTags);
    }
  }, [open]);

  const create = async () => {
    if (!newName.trim()) return;
    const res = await fetch(`${API}/opls/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    if (res.ok) {
      setNewName('');
      fetch(`${API}/opls/tags`).then(r => r.json()).then(setTags);
      onUpdate();
    }
  };

  const remove = async (tagId) => {
    setConfirm({ open: true, tagId });
  };

  const confirmRemove = async () => {
    if (!confirm.tagId) return;
    await fetch(`${API}/opls/tags/${confirm.tagId}`, { method: 'DELETE' });
    fetch(`${API}/opls/tags`).then(r => r.json()).then(setTags);
    onUpdate();
    setConfirm({ open: false, tagId: null });
  };

  const colors = ['#1976d2', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#009688', '#795548', '#607d8b'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Управление тегами</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Новый тег"
              size="small"
              fullWidth
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 1, cursor: 'pointer',
                bgcolor: newColor, border: '2px solid #ccc',
              }}
              onClick={() => {
                const idx = colors.indexOf(newColor);
                setNewColor(colors[(idx + 1) % colors.length]);
              }}
            />
          </Box>
          <Button onClick={create} disabled={!newName.trim()} size="small">Создать</Button>
          <Stack spacing={1}>
            {tags.map(tag => (
              <Box key={tag.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={tag.name}
                  size="small"
                  sx={{ bgcolor: tag.color, color: 'white', fontWeight: 500 }}
                />
                <Box sx={{ flex: 1 }} />
                <IconButton size="small" onClick={() => remove(tag.id)}>
                  <DeleteIcon fontSize="small" sx={{ color: '#d32f2f' }} />
                </IconButton>
              </Box>
            ))}
            {tags.length === 0 && (
              <Typography variant="body2" color="text.secondary">Нет тегов</Typography>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}
