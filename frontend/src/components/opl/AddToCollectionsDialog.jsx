import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Divider,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const API = '/api';

export default function AddToCollectionsDialog({ open, onClose, oplId }) {
  const [allCollections, setAllCollections] = useState([]);
  const [currentIds, setCurrentIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/collections/`).then(r => r.json()),
      fetch(`${API}/opls/${oplId}/collections`).then(r => r.json()),
    ]).then(([all, current]) => {
      setAllCollections(all);
      const ids = current.map(c => c.id);
      setCurrentIds(ids);
      setSelectedIds(ids);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, oplId]);

  const toggle = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const toAdd = selectedIds.filter(id => !currentIds.includes(id));
    const toRemove = currentIds.filter(id => !selectedIds.includes(id));

    const removes = toRemove.map(cid =>
      fetch(`${API}/opls/${oplId}/collections/${cid}`, { method: 'DELETE' })
    );
    if (toAdd.length) {
      removes.push(
        fetch(`${API}/opls/${oplId}/collections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection_ids: toAdd }),
        })
      );
    }
    await Promise.all(removes);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderOpenIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Коллекции
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Выберите коллекции, к которым принадлежит эта инструкция
        </Typography>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            Загрузка...
          </Box>
        ) : allCollections.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            Нет коллекций. Создайте коллекцию в меню слева.
          </Box>
        ) : (
          <List>
            {allCollections.map((coll, idx) => {
              const checked = selectedIds.includes(coll.id);
              return (
                <React.Fragment key={coll.id}>
                  <ListItem disableGutters>
                    <ListItemButton onClick={() => toggle(coll.id)}>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={checked}
                          tabIndex={-1}
                          disableRipple
                          sx={{ ml: -0.5 }}
                        />
                      </ListItemIcon>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {checked ? (
                          <FolderOpenIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                        ) : (
                          <FolderIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                        )}
                        <ListItemText
                          primary={coll.title}
                          primaryTypographyProps={{ fontWeight: checked ? 600 : 400 }}
                          secondary={coll.description}
                          secondaryTypographyProps={{ color: 'text.secondary' }}
                        />
                      </Box>
                    </ListItemButton>
                  </ListItem>
                  {idx < allCollections.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Chip
          label={`${selectedIds.length} ${selectedIds.length === 1 ? 'выбрана' : 'выбрано'}`}
          size="small"
          variant="outlined"
        />
        <Button onClick={onClose} sx={{ borderRadius: 1 }}>Отмена</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? null : <CheckCircleOutlineIcon />}
          sx={{ borderRadius: 2 }}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
