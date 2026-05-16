import { useState } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Badge,
  Chip,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useCollections } from '../../hooks/useCollections';
import { useAuth } from '../auth/AuthProvider';

export default function CollectionSidebar({ width = 240, onWidthChange }) {
  const { user } = useAuth();
  const {
    collections,
    activeCollectionId,
    setActiveCollectionId,
    createCollection,
    deleteCollection,
    updateCollection,
  } = useCollections();
  const [managerOpen, setManagerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const isMobile = useMediaQuery('(max-width:600px)');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createCollection(newName.trim(), newDesc.trim() || null);
      setNewName('');
      setNewDesc('');
      setCreating(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const activeCollection = collections.find(c => c.id === activeCollectionId);

  return (
    <Box sx={{
      width,
      minWidth: width,
      height: '100%',
      borderRight: '1px solid #e0e0e0',
      bgcolor: '#fafafa',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Коллекции
          </Typography>
          {user && (
            <Tooltip title="Управление">
              <IconButton size="small" onClick={() => setManagerOpen(true)}>
                <ManageAccountsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Divider />

      {/* Collection List */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        <List disablePadding>
          {collections.map((coll) => {
            const isActive = coll.id === activeCollectionId;
            return (
              <Box key={coll.id}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => setActiveCollectionId(coll.id)}
                  dense
                  sx={{
                    borderRadius: 1.5,
                    mx: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.main' },
                      '& .MuiBadge-badge': { bgcolor: 'white', color: 'primary.main' },
                    },
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 32 }}>
                    <Avatar sx={{
                      width: 28, height: 28, bgcolor: isActive ? 'rgba(255,255,255,0.3)' : 'primary.light',
                      fontSize: 14,
                    }}>
                      {isActive ? <FolderOpenIcon fontSize="small" /> : <FolderIcon fontSize="small" />}
                    </Avatar>
                  </ListItemAvatar>
                  <Badge
                    badgeContent={coll.opl_count}
                    color="primary"
                    sx={{ flex: 1, ml: 0.5 }}
                  >
                    <ListItemText
                      primary={coll.name}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: isActive ? 600 : 400,
                        noWrap: true,
                      }}
                    />
                  </Badge>
                </ListItemButton>
              </Box>
            );
          })}
        </List>
      </Box>

      {/* Footer */}
      {user && (
        <>
          <Divider />
          <Box sx={{ p: 1 }}>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => { setCreating(true); setManagerOpen(true); }}
              sx={{ borderRadius: 1.5 }}
            >
              Новая коллекция
            </Button>
          </Box>
        </>
      )}

      {/* Manager Dialog */}
      <Dialog open={managerOpen} onClose={() => { setManagerOpen(false); setCreating(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>Управление коллекциями</DialogTitle>
        <DialogContent dividers>
          {creating ? (
            <Box sx={{ pt: 1, pb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Создание коллекции</Typography>
              <TextField
                label="Название"
                fullWidth
                size="small"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                sx={{ mb: 1.5, borderRadius: 1 }}
                autoFocus
              />
              <TextField
                label="Описание (необязательно)"
                fullWidth
                multiline
                rows={2}
                size="small"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                sx={{ mb: 2, borderRadius: 1 }}
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => { setCreating(false); setNewName(''); setNewDesc(''); }}>Отмена</Button>
                <Button variant="contained" size="small" onClick={handleCreate} disabled={!newName.trim()}>
                  Создать
                </Button>
              </Box>
            </Box>
          ) : (
            <List>
              {collections.map((coll) => (
                <CollectionListItem
                  key={coll.id}
                  collection={coll}
                  isActive={coll.id === activeCollectionId}
                  onActivate={() => { setActiveCollectionId(coll.id); setManagerOpen(false); }}
                  onUpdate={updateCollection}
                  onDelete={deleteCollection}
                  isDefault={coll.name === 'Общие'}
                />
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setManagerOpen(false); setCreating(false); }}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function CollectionListItem({ collection, isActive, onActivate, onUpdate, onDelete, isDefault }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(collection.name);
  const [desc, setDesc] = useState(collection.description || '');

  const handleSave = async () => {
    try {
      await onUpdate(collection.id, { name: name.trim(), description: desc.trim() || null });
      setEditing(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Удалить коллекцию «${collection.name}»? Инструкции будут перемещены в «Общие»`)) return;
    try {
      await onDelete(collection.id);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <Box sx={{ borderBottom: '1px solid #f0f0f0' }}>
      {editing ? (
        <Box sx={{ p: 2 }}>
          <TextField
            label="Название"
            fullWidth
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 1, borderRadius: 1 }}
            autoFocus
          />
          <TextField
            label="Описание"
            fullWidth
            multiline
            rows={2}
            size="small"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            sx={{ mb: 1.5, borderRadius: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size="small" onClick={() => { setEditing(false); setName(collection.name); }}>Отмена</Button>
            <Button variant="contained" size="small" onClick={handleSave} disabled={!name.trim()}>
              Сохранить
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, gap: 1 }}>
          <Box sx={{ flex: 1, cursor: 'pointer' }} onClick={onActivate}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={isActive ? <CheckCircleIcon fontSize="small" /> : <FolderIcon fontSize="small" />}
                label={collection.name}
                size="small"
                sx={{
                  bgcolor: isActive ? 'primary.main' : 'grey.100',
                  color: isActive ? 'white' : 'text.primary',
                  fontWeight: isActive ? 600 : 400,
                }}
              />
              <Chip label={`${collection.opl_count} инструкций`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
              {isDefault && <Chip label="по умолчанию" size="small" sx={{ bgcolor: 'grey.200', fontSize: '0.65rem' }} />}
            </Box>
            {collection.description && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {collection.description}
              </Typography>
            )}
          </Box>
          {!isDefault && (
            <Box>
              <IconButton size="small" onClick={() => setEditing(true)}>
                <EditIcon fontSize="small" color="disabled" />
              </IconButton>
              <IconButton size="small" onClick={handleDelete}>
                <DeleteIcon fontSize="small" color="disabled" />
              </IconButton>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
