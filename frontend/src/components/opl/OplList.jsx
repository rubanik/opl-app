import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import TagIcon from '@mui/icons-material/Tag';
import DescriptionIcon from '@mui/icons-material/Description';
import ShareIcon from '@mui/icons-material/Share';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { QRCodeSVG } from 'qrcode.react';

import OplCard from './OplCard';
import CreateDialog from './CreateDialog';
import TagManagerDialog from './TagManagerDialog';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import { ListSkeleton } from '../common/LoadingSkeleton';
import { useAuth } from '../auth/AuthProvider';
import { useApi } from '../../hooks/useApi';

const API = '/api';
const APP_URL = window.location.origin;

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
  const [shareQrOpen, setShareQrOpen] = useState(false);
  const debounceRef = useRef(null);
  const undoTimerRef = useRef(null);
  const undoIntervalRef = useRef(null);
  const { user, checkAuth } = useAuth();
  const { del: apiDelete, toast: apiToast, setToast: setApiToast } = useApi();
  const isMobile = useMediaQuery('(max-width:600px)');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    if (qParam) {
      setSearchQuery(qParam);
      setDebouncedQuery(qParam);
    }
  }, []);

  useEffect(() => {
    if (!allTags.length) return;
    const params = new URLSearchParams(window.location.search);
    const tagParam = params.get('tag');
    if (!tagParam) return;
    const names = tagParam.split(',');
    const ids = allTags.filter(t => names.includes(t.name)).map(t => t.id);
    if (ids.length) setSelectedTagIds(ids);
  }, [allTags]);

  useEffect(() => {
    fetch(`${API}/opls/tags`).then(r => r.json()).then(setAllTags);
  }, []);

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

  const hasActiveFilters = selectedTagIds.length > 0 || debouncedQuery;
  const shareTagNames = useMemo(() =>
    selectedTagIds.map(tid => allTags.find(t => t.id === tid)?.name).filter(Boolean),
    [selectedTagIds, allTags]
  );
  const shareUrl = useMemo(() => {
    const url = new URL(APP_URL);
    if (shareTagNames.length) url.searchParams.set('tag', shareTagNames.join(','));
    if (debouncedQuery) url.searchParams.set('q', debouncedQuery);
    return url.toString();
  }, [shareTagNames, debouncedQuery]);
  const shareDescription = useMemo(() => {
    const parts = [];
    if (shareTagNames.length) parts.push(`по тегу: ${shareTagNames.join(', ')}`);
    if (debouncedQuery) parts.push(`с запросом: "${debouncedQuery}"`);
    return parts.length
      ? `Инструкции ${parts.join(', ')} (${total} шт.)`
      : `Все инструкции (${total} шт.)`;
  }, [shareTagNames, debouncedQuery, total]);

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
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {hasActiveFilters && (
              <Tooltip title="Поделиться списком" arrow>
                <IconButton
                  size="small"
                  onClick={() => setShareQrOpen(true)}
                >
                  <ShareIcon />
                </IconButton>
              </Tooltip>
            )}
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

          </Box>
        </Box>
      )}

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
            {hasActiveFilters && (
              <Tooltip title="Поделиться списком" arrow>
                <IconButton
                  size="small"
                  onClick={() => setShareQrOpen(true)}
                >
                  <ShareIcon />
                </IconButton>
              </Tooltip>
            )}
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

      <Dialog open={shareQrOpen} onClose={() => setShareQrOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeIcon color="primary" />
            Поделиться списком
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
              {shareDescription}
            </Typography>
            <Box sx={{ my: 3 }}>
              <QRCodeSVG value={shareUrl} size={220} />
            </Box>
            <Box sx={{
              px: 2, py: 1, bgcolor: 'grey.100', borderRadius: 1,
              wordBreak: 'break-all', fontSize: '0.75rem', mb: 2,
            }}>
              {shareUrl}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1, px: 2, pb: 2 }}>
          <Button
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              setToast({ open: true, msg: 'Ссылка скопирована', severity: 'success' });
            }}
          >
            Копировать
          </Button>
          <Button
            size="small"
            startIcon={<PrintIcon />}
            onClick={() => {
              const svgEl = document.querySelector(`[data-testid^='QRCode']`) ||
                document.querySelector('svg[role="img"]');
              const svgStr = svgEl ? svgEl.outerHTML : '';
              const svgBase64 = svgStr
                ? 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)))
                : '';
              const win = window.open('', '', 'width=400,height=500');
              win.document.write(`
                <!DOCTYPE html>
                <html><head><meta charset="utf-8">
                <title>Поделиться инструкциями</title>
                <style>
                  body { text-align: center; font-family: Arial, sans-serif; padding: 30px; }
                  h2 { font-size: 18px; margin-bottom: 8px; }
                  p { font-size: 12px; color: #666; margin-bottom: 20px; word-break: break-all; }
                  img, svg { max-width: 220px; margin: 20px auto; display: block; }
                </style></head>
                <body>
                  <h2>${shareDescription}</h2>
                  <p>${shareUrl}</p>
                  ${svgBase64 ? `<img src="${svgBase64}">` : `<h3>${shareDescription}</h3>`}
                </body></html>
              `);
              win.document.close();
              setTimeout(() => { win.print(); }, 300);
            }}
          >
            Печать
          </Button>
          <Button size="small" onClick={() => setShareQrOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

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
