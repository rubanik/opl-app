import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  TextField,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  Divider,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '../auth/AuthProvider';
import ConfirmDialog from '../common/ConfirmDialog';

const API = '/api';
const MAX_CHARS = 600;

export default function CommentsDrawer({ open, onClose, oplId, commentCount }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && oplId) fetchComments();
  }, [open, oplId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/opls/${oplId}/comments`);
      if (res.ok) setComments(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newText.trim() || saving) return;
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/opls/${oplId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setComments(prev => [...prev, created]);
        setNewText('');
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const startEdit = (comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/opls/${oplId}/comments/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText.trim() }),
      });
      if (res.ok) {
        setComments(prev => prev.map(c => c.id === editingId ? { ...c, text: editText.trim(), updated_at: new Date().toISOString() } : c));
        setEditingId(null);
        setEditText('');
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/opls/${oplId}/comments/${deleteTarget}`, { method: 'DELETE' });
      if (res.ok) setComments(prev => prev.filter(c => c.id !== deleteTarget));
    } catch { /* ignore */ }
    setSaving(false);
    setDeleteTarget(null);
  };

  const getAuthorName = (author) => {
    if (!author) return '';
    const sn = author.surname || '';
    const gn = author.given_name || '';
    if (sn && gn) return `${sn} ${gn[0]}.`;
    if (sn) return sn;
    return author.username;
  };

  const getAuthorInitials = (author) => {
    if (!author) return '?';
    const sn = (author.surname || '').slice(0, 1).toUpperCase();
    const gn = (author.given_name || '').slice(0, 1).toUpperCase();
    return (sn + gn) || author.username.slice(0, 2).toUpperCase();
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 360 }, p: 0 } } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
              Комментарии ({comments.length})
            </Typography>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">Загрузка...</Typography>
              </Box>
            ) : comments.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">Нет комментариев</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {comments.map((c, i) => (
                  <React.Fragment key={c.id}>
                    {i > 0 && <Divider />}
                    {editingId === c.id ? (
                      <ListItem sx={{ px: 2, py: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 30, height: 30, fontSize: '0.7rem', bgcolor: 'grey.300', color: 'grey.700' }}>
                            {getAuthorInitials(c.author)}
                          </Avatar>
                        </ListItemAvatar>
                        <Box sx={{ flex: 1 }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            size="small"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            inputRef={inputRef}
                            sx={{ mb: 0.5 }}
                          />
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">{editText.length}/{MAX_CHARS}</Typography>
                            <Tooltip title="Сохранить">
                              <IconButton size="small" onClick={handleSaveEdit} disabled={saving}>
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Отмена">
                              <IconButton size="small" onClick={() => { setEditingId(null); setEditText(''); }}>
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </ListItem>
                    ) : (
                      <ListItem sx={{ px: 2, py: 1.5 }}>
                        <ListItemAvatar sx={{ mr: 1.5 }}>
                          <Avatar sx={{ width: 30, height: 30, fontSize: '0.7rem', bgcolor: 'grey.300', color: 'grey.700' }}>
                            {getAuthorInitials(c.author)}
                          </Avatar>
                        </ListItemAvatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.3 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                              {getAuthorName(c.author)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTime(c.created_at)}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: user && user.id === c.user_id ? 0.5 : 0 }}>
                            {c.text}
                          </Typography>
                          {user && user.id === c.user_id && (
                            <Box sx={{ display: 'flex', gap: 0.25, mt: 0.5 }}>
                              <Tooltip title="Редактировать" placement="top">
                                <IconButton size="small" onClick={() => startEdit(c)} sx={{ padding: 2 }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Удалить" placement="top">
                                <IconButton size="small" onClick={() => setDeleteTarget(c.id)} sx={{ padding: 2, color: 'error.main' }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                      </ListItem>
                    )}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>

          {user && (
            <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    placeholder="Написать комментарий..."
                    value={newText}
                    onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setNewText(e.target.value); }}
                    onKeyDown={handleKeyDown}
                    InputProps={{
                      endAdornment: (
                        <Box sx={{ position: 'absolute', bottom: 4, right: 8 }}>
                          <Typography variant="caption" color="text.secondary">{newText.length}/{MAX_CHARS}</Typography>
                        </Box>
                      ),
                    }}
                    sx={{ borderRadius: 2 }}
                  />
                </Box>
                <Tooltip title={newText.trim() ? 'Отправить' : 'Введите текст'}>
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={handleCreate}
                    disabled={!newText.trim() || saving || newText.length > MAX_CHARS}
                    sx={{ flexShrink: 0 }}
                  >
                    <SendIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}
        </Box>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Удалить комментарий?"
        message="Это действие нельзя отменить."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
