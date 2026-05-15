import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Chip,
  Fade,
  Tooltip,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  Pagination,
  Snackbar,
  Alert,
  Fab,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import LoginIcon from '@mui/icons-material/Login';
import TagIcon from '@mui/icons-material/Tag';
import DescriptionIcon from '@mui/icons-material/Description';

import OplCard from './OplCard';
import CreateDialog from './CreateDialog';
import TagManagerDialog from './TagManagerDialog';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import { ListSkeleton } from '../common/LoadingSkeleton';
import { useAuth } from '../auth/AuthProvider';
import { useApi } from '../../hooks/useApi';

const API = '/api';

export default function OplList() {
  const [opls, setOpls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const [undoDelete, setUndoDelete] = useState({ open: false, opl: null, id: null, remaining: 5 });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });
  const debounceRef = useRef(null);
  const undoTimerRef = useRef(null);
  const undoIntervalRef = useRef(null);
  const { user, checkAuth } = useAuth();
  const { del: apiDelete, toast: apiToast, setToast: setApiToast } = useApi();
  const isMobile = useMediaQuery('(max-width:600px)');

  const fetchOpls = useCallback(async (query) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) {
      params.set('title', query);
      params.set('description', query);
    }
    if (selectedTagIds.length > 0) {
      selectedTagIds.forEach(tid => params.append('tag_ids', tid));
    }
    params.set('skip', String((currentPage - 1) * ITEMS_PER_PAGE));
    params.set('limit', String(ITEMS_PER_PAGE));
    const res = await fetch(`${API}/opls/?${params.toString()}`);
    let data = await res.json();
    setTotal(data.total);
    let items = data.items;
    switch (sortBy) {
      case 'newest': items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case 'oldest': items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case 'nameAZ': items.sort((a, b) => a.title.localeCompare(b.title, 'ru')); break;
      case 'nameZA': items.sort((a, b) => b.title.localeCompare(a.title, 'ru')); break;
      default: break;
    }
    setOpls(items);
    setLoading(false);
  }, [selectedTagIds, sortBy, currentPage]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  useEffect(() => { fetchOpls(); }, [fetchOpls]);
  useEffect(() => { setCurrentPage(1); }, [selectedTagIds, sortBy, searchQuery]);
  useEffect(() => {
    fetch(`${API}/opls/tags`).then(r => r.json()).then(setAllTags);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery) { setDebouncedQuery(''); fetchOpls(); return; }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      fetchOpls(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    };
  }, [searchQuery, fetchOpls]);

  useEffect(() => {
    if (undoDelete.open) {
      undoIntervalRef.current = setInterval(() => {
        setUndoDelete(prev => {
          if (prev.remaining <= 1) {
            if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
            undoIntervalRef.current = null;
            return { ...prev, remaining: 0 };
          }
          return { ...prev, remaining: prev.remaining - 1 };
        });
      }, 1000);
    }
    return () => {
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
      undoIntervalRef.current = null;
    };
  }, [undoDelete.open]);

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleDeleteConfirm = () => {
    setDeleteConfirm({ open: false, id: null });
  };

  const handleDelete = async (id) => {
    const oplToDelete = opls.find(o => o.id === id);
    if (!oplToDelete) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setOpls(prev => prev.filter(o => o.id !== id));
    setTotal(prev => Math.max(0, prev - 1));
    setUndoDelete({ open: true, opl: oplToDelete, id, remaining: 5 });
    undoTimerRef.current = setTimeout(async () => {
      await apiDelete(`/opls/${id}`);
      setUndoDelete({ open: false, opl: null, id: null });
      undoTimerRef.current = null;
      setToast({ open: true, msg: 'Удалено', severity: 'info' });
      fetchOpls();
    }, 5000);
  };

  const handleUndoDelete = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    undoIntervalRef.current = null;
    setOpls(prev => [undoDelete.opl, ...prev]);
    setTotal(prev => prev + 1);
    setUndoDelete({ open: false, opl: null, id: null });
    undoTimerRef.current = null;
    setToast({ open: true, msg: 'Восстановлено', severity: 'success' });
  };

  const handleSnackbarClose = () => {
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    undoIntervalRef.current = null;
    setUndoDelete({ open: false, opl: null, id: null });
  };

  const handleCreate = async (createdOpl, stepPhotos, selectedTags) => {
    if (selectedTags?.length) {
      await fetch(`${API}/opls/${createdOpl.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_ids: selectedTags }),
      });
    }
    for (const { stepId, photos } of stepPhotos) {
      for (const photo of photos) {
        if (!photo.dataUrl) continue;
        const blob = await (await fetch(photo.dataUrl)).blob();
        const form = new FormData();
        form.append('file', blob, `photo${photo.display_order}.jpg`);
        await fetch(`${API}/opls/${createdOpl.id}/steps/${stepId}/photos?order=${photo.display_order}`, {
          method: 'POST',
          body: form,
        });
      }
    }
    setNewOpen(false);
    fetchOpls();
  };

  return (
    <Box>
      {/* Page title + action buttons - desktop */}
      {!isMobile && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Инструкции OPL
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {total} {getPluralWord(total, 'инструкция', 'инструкции', 'инструкций')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {user && (
              <>
                <Tooltip title="Управление тегами" arrow>
                  <IconButton size="small" onClick={() => setTagManagerOpen(true)}>
                    <TagIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setNewOpen(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Новая
                </Button>
              </>
            )}
            {!user && (
              <Tooltip title="Войдите, чтобы создавать и управлять инструкциями" arrow>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LoginIcon />}
                  onClick={() => checkAuth(() => setNewOpen(true))}
                  sx={{ borderRadius: 2 }}
                >
                  Войти
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}

      {/* Mobile title */}
      {isMobile && (
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Инструкции OPL
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {total} {getPluralWord(total, 'инструкция', 'инструкции', 'инструкций')}
              </Typography>
            </Box>
            {user && (
              <Tooltip title="Управление тегами" arrow>
                <IconButton size="small" onClick={() => setTagManagerOpen(true)}>
                  <TagIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}

      {/* Search + sort */}
      <Box sx={{ display: 'flex', gap: 1, mb: { xs: 1.5, sm: 2 } }}>
        <Fade in timeout={200}>
          <TextField
            fullWidth
            size="small"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{ borderRadius: 2 }}
          />
        </Fade>
        {!isMobile && (
          <FormControl size="small" sx={{ minWidth: 140, borderRadius: 2 }}>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              displayEmpty
              sx={{ bgcolor: 'white', height: '100%', borderRadius: 2 }}
            >
              <MenuItem value="newest">Сначала новые</MenuItem>
              <MenuItem value="oldest">Сначала старые</MenuItem>
              <MenuItem value="nameAZ">По имени А-Я</MenuItem>
              <MenuItem value="nameZA">По имени Я-А</MenuItem>
            </Select>
          </FormControl>
        )}
        {isMobile && (
          <Tooltip title="Сортировка" arrow>
            <IconButton
              size="small"
              onClick={() => setSortBy(prev => {
                const order = ['newest', 'oldest', 'nameAZ', 'nameZA'];
                return order[(order.indexOf(prev) + 1) % order.length];
              })}
              sx={{ bgcolor: 'white' }}
            >
              <DescriptionIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Tags filter */}
      {allTags.length > 0 && (
        <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
            {allTags.map(tag => {
              const active = selectedTagIds.includes(tag.id);
              return (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  clickable
                  onClick={() => setSelectedTagIds(prev =>
                    active ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                  )}
                  sx={{
                    bgcolor: active ? tag.color : 'transparent',
                    color: active ? 'white' : tag.color,
                    fontWeight: active ? 600 : 400,
                    border: `1.5px solid ${tag.color}`,
                    borderRadius: 2,
                    transition: 'all 0.15s',
                  }}
                />
              );
            })}
            {selectedTagIds.length > 0 && (
              <Button
                size="small"
                onClick={() => setSelectedTagIds([])}
                sx={{ fontSize: '0.75rem', textTransform: 'none' }}
              >
                Сбросить
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* OPL List */}
      <Stack spacing={{ xs: 1, sm: 2 }}>
        {loading ? (
          <ListSkeleton count={3} />
        ) : opls.length > 0 ? (
          opls.map((opl) => (
            <OplCard
              key={opl.id}
              opl={opl}
              onDelete={handleDeleteClick}
              user={user}
            />
          ))
        ) : (
          <EmptyState
            title={searchQuery ? 'Ничего не найдено' : 'Пока нет инструкций'}
            description={searchQuery ? 'Попробуйте изменить запрос' : 'Создайте первую инструкцию OPL'}
            actionLabel={user ? 'Создать' : undefined}
            onAction={user ? () => setNewOpen(true) : undefined}
            icon={<DescriptionIcon sx={{ fontSize: 48, color: 'text.disabled' }} />}
          />
        )}
      </Stack>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            sx={{ borderRadius: 2 }}
          />
        </Box>
      )}

      {/* FAB for mobile */}
      {isMobile && user && (
        <Fab
          size="medium"
          color="primary"
          onClick={() => setNewOpen(true)}
          sx={{ position: 'fixed', bottom: 24, right: 24, boxShadow: 4 }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Dialogs */}
      <CreateDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSubmit={handleCreate}
        tags={allTags}
      />
      <TagManagerDialog
        open={tagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
        onUpdate={() => {
          fetch(`${API}/opls/tags`).then(r => r.json()).then(setAllTags);
          fetchOpls();
        }}
      />
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Удалить инструкцию?"
        message={`Вы уверены, что хотите удалить «${opls.find(o => o.id === deleteConfirm.id)?.title}»?`}
        onConfirm={() => {
          const id = deleteConfirm.id;
          handleDeleteConfirm();
          handleDelete(id);
        }}
        onCancel={handleDeleteConfirm}
      />

      {/* Toasts */}
      <Snackbar
        open={undoDelete.open}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={handleSnackbarClose}
      >
        <Alert severity="info" onClose={handleSnackbarClose} action={
          <Button size="small" onClick={handleUndoDelete} sx={{ color: 'white' }}>
            Отменить
          </Button>
        }>
          {undoDelete.opl?.title} удалена — {undoDelete.remaining}с
        </Alert>
      </Snackbar>
      <Snackbar
        open={toast.open}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={2000}
        onClose={() => setToast({ ...toast, open: false })}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
      <Snackbar
        open={apiToast.open}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={3000}
        onClose={() => setApiToast({ ...apiToast, open: false })}
      >
        <Alert severity={apiToast.severity} onClose={() => setApiToast({ ...apiToast, open: false })}>
          {apiToast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function getPluralWord(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
