import React, { useState } from 'react';
import {
  Box,
  Menu,
  MenuItem,
  Typography,
  IconButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ListIcon from '@mui/icons-material/List';

import { useCollection } from '../collections/CollectionContext';
import ConfirmDialog from '../common/ConfirmDialog';

export default function CollectionSelector({ isMobile }) {
  const {
    collections,
    activeCollection,
    activeCollectionId,
    switchCollection,
    createCollection,
    updateCollection,
    deleteCollection,
    loading,
  } = useCollection();

  const [anchorEl, setAnchorEl] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editOpen, setEditOpen] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const showSnackbar = (message, severity = 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await createCollection(newTitle.trim(), newDesc.trim() || null);
      setNewTitle('');
      setNewDesc('');
      setNewOpen(false);
      handleMenuClose();
    } catch (e) {
      showSnackbar(e.message || 'Не удалось создать коллекцию');
    }
  };

  const handleSaveEdit = async () => {
    if (!editOpen || !editOpen.title.trim()) return;
    try {
      await updateCollection(editOpen.id, {
        title: editOpen.title.trim(),
        description: editOpen.description?.trim() || null,
      });
      setEditOpen(null);
      handleMenuClose();
    } catch (e) {
      showSnackbar(e.message || 'Не удалось сохранить изменения');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteCollection(deleteConfirm);
      setDeleteConfirm(null);
      handleMenuClose();
    } catch (e) {
      showSnackbar(e.message || 'Не удалось удалить коллекцию');
      setDeleteConfirm(null);
    }
  };

  if (loading) return null;

  return (
    <>
      {!collections.length ? (
        <Tooltip title='Создать первую коллекцию' arrow>
          <IconButton
            size='small'
            color='inherit'
            onClick={() => setNewOpen(true)}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <>
          {isMobile ? (
            <IconButton size='small' color='inherit' onClick={handleMenuOpen}>
              {activeCollection ? <FolderOpenIcon /> : <FolderIcon />}
            </IconButton>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }} onClick={handleMenuOpen}>
              <IconButton size='small' color='inherit' onClick={handleMenuOpen}>
                {activeCollection ? <FolderOpenIcon /> : <FolderIcon />}
              </IconButton>
              <Typography
                variant='body2'
                sx={{
                  color: 'inherit',
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeCollection?.title || 'Все инструкции'}
              </Typography>
            </Box>
          )}

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} keepMounted>
            <MenuItem
              selected={!activeCollectionId}
              onClick={() => {
                switchCollection(null);
                handleMenuClose();
              }}
              sx={{ fontSize: '0.875rem', justifyContent: 'space-between' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ListIcon fontSize='small' color={!activeCollectionId ? 'primary' : 'disabled'} />
                <Typography variant='body2'>Все инструкции</Typography>
              </Box>
            </MenuItem>
            {collections.map((coll) => (
              <MenuItem
                key={coll.id}
                selected={coll.id === activeCollection?.id}
                onClick={() => {
                  switchCollection(coll.id);
                  handleMenuClose();
                }}
                sx={{
                  fontSize: '0.875rem',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {coll.id === activeCollection?.id ? (
                    <FolderOpenIcon fontSize='small' color='primary' />
                  ) : (
                    <FolderIcon fontSize='small' color='disabled' />
                  )}
                  <Typography variant='body2'>{coll.title}</Typography>
                </Box>
                <IconButton
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditOpen({
                      id: coll.id,
                      title: coll.title,
                      description: coll.description,
                    });
                  }}
                >
                  <MoreVertIcon fontSize='small' />
                </IconButton>
              </MenuItem>
            ))}
            <Divider />
            <MenuItem onClick={() => setNewOpen(true)}>
              <ListItemIcon><AddIcon fontSize='small' /></ListItemIcon>
              <ListItemText primary='Новая коллекция' primaryTypographyProps={{ variant: 'body2' }} />
            </MenuItem>
          </Menu>
        </>
      )}

      {/* New collection dialog */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Новая коллекция</DialogTitle>
        <DialogContent dividers>
          <TextField
            label='Название'
            fullWidth
            autoFocus
            margin='dense'
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label='Описание'
            fullWidth
            multiline
            rows={2}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder='Описание коллекции (необязательно)'
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setNewOpen(false)}>Отмена</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
            disabled={!newTitle.trim()}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={Boolean(editOpen)}
        onClose={() => setEditOpen(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Редактировать коллекцию</DialogTitle>
        <DialogContent dividers>
          <TextField
            label='Название'
            fullWidth
            autoFocus
            margin='dense'
            value={editOpen?.title || ''}
            onChange={(e) => setEditOpen(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label='Описание'
            fullWidth
            multiline
            rows={2}
            value={editOpen?.description || ''}
            onChange={(e) => setEditOpen(prev => ({ ...prev, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            color='error'
            onClick={() => {
              setDeleteConfirm(editOpen?.id);
              setEditOpen(null);
            }}
            startIcon={<DeleteIcon />}
          >
            Удалить
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setEditOpen(null)}>Отмена</Button>
          <Button
            variant='contained'
            onClick={handleSaveEdit}
            disabled={!editOpen?.title?.trim()}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title='Удалить коллекцию?'
        message='Инструкции не будут удалены, но связь с коллекцией будет потеряна.'
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Error snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant='filled'
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
