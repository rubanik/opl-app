import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  IconButton,
  Card,
  CardContent,
  Button,
  TextField,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Step,
  StepLabel,
  Stepper,
  Paper,
  Snackbar,
  Alert,
  InputAdornment,
  Fade,
  Autocomplete,
  Tooltip,
  Skeleton,
  MenuItem,
  Select,
  FormControl,
  Breadcrumbs,
  Pagination,
  useMediaQuery,
} from '@mui/material';
import { Link as MuiLink, Avatar, Tabs, Tab, CircularProgress } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import TimerIcon from '@mui/icons-material/Timer';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import CopyLinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import HomeIcon from '@mui/icons-material/Home';
import CodeIcon from '@mui/icons-material/Code';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LogoutIcon from '@mui/icons-material/Logout';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { QRCodeSVG } from 'qrcode.react';

const API = '/api';
const APP_URL = window.location.origin;

/* ---- Auth Context ---- */
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    fetch(`${API}/auth/me`)
      .then(r => r.ok ? r.json() : null)
      .then(u => { setUser(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user && pendingAction) {
      setAuthOpen(false);
      setPendingAction(null);
      setTimeout(() => pendingAction(), 150);
    }
  }, [user]);

  const checkAuth = useCallback((onRequireAuth) => {
    if (user) { onRequireAuth(); return true; }
    setPendingAction(onRequireAuth);
    setAuthOpen(true);
    return false;
  }, [user]);

  const login = async (credentials) => {
    const formData = new URLSearchParams();
    formData.set('username', credentials.username);
    formData.set('password', credentials.password);
    formData.set('scope', '');
    formData.set('remember', credentials.remember ? 'true' : 'false');
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });
    if (!res.ok) throw new Error('Неверный логин или пароль');
    const data = await res.json();
    setUser(data.user);
    setAuthOpen(false);
  };

  const register = async (credentials) => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Ошибка регистрации');
    }
    const data = await res.json();
    setUser(data.user);
    setAuthOpen(false);
  };

  const logout = async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, authOpen, setAuthOpen, pendingAction, checkAuth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

/* ---- Auth Dialog ---- */
function AuthDialog() {
  const { authOpen, setAuthOpen, pendingAction, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError('');
    setSaving(true);
    try {
      if (mode === 'login') {
        await login({ username, password, remember });
      } else {
        await register({ username, password, email });
      }
      setUsername('');
      setPassword('');
      setEmail('');
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const handleTabChange = (_, v) => {
    setTabValue(v);
    setMode(v === 0 ? 'login' : 'register');
    setError('');
  };

  return (
    <Dialog open={authOpen} onClose={() => setAuthOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="Вход" />
          <Tab label="Регистрация" />
        </Tabs>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">Для этого действия нужна авторизация</Alert>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
          )}
          <TextField
            label="Логин"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            inputProps={{ minLength: 3 }}
          />
          <TextField
            label="Пароль"
            type={showPass ? 'text' : 'password'}
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPass(!showPass)} edge="end">
                    {showPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {mode === 'register' && (
            <TextField
              label="Email (необязательно)"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
          {mode === 'login' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <Typography variant="body2">Запомнить меня</Typography>
            </label>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => { setAuthOpen(false); if (pendingAction) setPendingAction(null); }}>Отмена</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={!username.trim() || !password.trim() || saving}
        >
          {saving ? <CircularProgress size={20} /> : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---- Header User Area ---- */
function HeaderUserArea() {
  const { user, setAuthOpen, logout } = useAuth();

  if (!user) {
    return (
      <Button
        size="small"
        variant="outlined"
        startIcon={<LoginIcon />}
        onClick={() => setAuthOpen(true)}
        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}
      >
        Войти
      </Button>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(255,255,255,0.2)' }}>
        <AccountCircleIcon fontSize="small" />
      </Avatar>
      <Typography variant="body2" sx={{ color: 'white', fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
        {user.username}
      </Typography>
      <IconButton size="small" sx={{ color: 'white' }} onClick={logout}>
        <LogoutIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

/* ---- Confirm Dialog ---- */
function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>Отмена</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>Удалить</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---- Tag Manager Dialog ---- */
function TagManagerDialog({ open, onClose, onUpdate }) {
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
      <ConfirmDialog
        open={confirm.open}
        title="Удалить тег?"
        message="Это действие нельзя отменить."
        onConfirm={confirmRemove}
        onCancel={() => setConfirm({ open: false, tagId: null })}
      />
    </Dialog>
  );
}

/* ---- OPL List ---- */
function OplList() {
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
  const navigate = useNavigate();
  const { user, checkAuth } = useAuth();

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

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTagIds, sortBy, searchQuery]);

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
      await fetch(`${API}/opls/${id}`, { method: 'DELETE' });
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 1.5, sm: 3 }, px: { xs: 0.5, sm: 1 } }}>
        <Typography variant={{ xs: 'h6', sm: 'h5' }} sx={{ fontWeight: 700 }}>
          Инструкции OPL
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {user && (
            <>
              <Tooltip title="Управление тегами" arrow>
                <IconButton
                  size="small"
                  onClick={() => setTagManagerOpen(true)}
                  sx={{ color: 'white' }}
                >
                  <AddIcon fontSize="small" />
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
                sx={{ borderRadius: 2, color: 'white', borderColor: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}
              >
                Войти
              </Button>
            </Tooltip>
          )}
        </Box>
      </Box>

      {allTags.length > 0 && (
        <Box sx={{ mb: { xs: 1, sm: 2 } }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
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
                    border: `1px solid ${tag.color}`,
                  }}
                />
              );
            })}
            {selectedTagIds.length > 0 && (
              <Button size="small" onClick={() => setSelectedTagIds([])} sx={{ fontSize: '0.7rem' }}>
                Сбросить
              </Button>
            )}
          </Stack>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, mb: { xs: 1, sm: 2 } }}>
        <Fade in timeout={200}>
          <TextField
            fullWidth
            size="small"
            placeholder="Поиск по названию и описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </Fade>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            displayEmpty
            sx={{ bgcolor: 'white', height: '100%' }}
          >
            <MenuItem value="newest">Сначала новые</MenuItem>
            <MenuItem value="oldest">Сначала старые</MenuItem>
            <MenuItem value="nameAZ">По имени А-Я</MenuItem>
            <MenuItem value="nameZA">По имени Я-А</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Stack spacing={{ xs: 1, sm: 2 }}>
        {loading && (
          <>
            {[0, 1, 2].map((i) => (
              <Card key={i} sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                  <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rectangular" width={50} height={24} sx={{ borderRadius: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </>
        )}
        {!loading && opls.map((opl) => (
          <Card
            key={opl.id}
            sx={{
              borderRadius: 2,
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.15)' },
            }}
            onClick={() => navigate(`/opl/${opl.id}`)}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant={{ xs: 'subtitle1', sm: 'h6' }} sx={{ fontWeight: 600, mb: { xs: 0.5, sm: 1 } }}>
                    {opl.title}
                  </Typography>
                  {opl.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 0.5, sm: 1 } }}>
                      {opl.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {(opl.tags || []).map(tag => (
                      <Chip
                        key={tag.id}
                        label={tag.name}
                        size="small"
                        sx={{ bgcolor: tag.color, color: 'white', fontWeight: 500, fontSize: '0.7rem' }}
                      />
                    ))}
                    <Chip
                      label={`${opl.step_count} шага`}
                      size="small"
                      sx={{ bgcolor: '#e3f2fd', fontSize: '0.7rem' }}
                    />
                    <Chip
                      label={new Date(opl.created_at).toLocaleDateString('ru-RU')}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Box>
                </Box>
                {user ? (
                  <IconButton
                    sx={{ color: '#aaa', ml: 1 }}
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(opl.id); }}
                  >
                    <DeleteIcon />
                  </IconButton>
                ) : (
                  <Tooltip title="Войдите, чтобы удалять">
                    <Box sx={{ width: 36, height: 36, ml: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DeleteIcon sx={{ color: '#ddd', fontSize: 20 }} />
                    </Box>
                  </Tooltip>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}

        {opls.length === 0 && !loading && (
          <Paper sx={{ p: { xs: 2, sm: 4 }, textAlign: 'center', bgcolor: '#fafafa' }}>
            <Typography color="text.secondary">Нет инструкций. Создайте первую!</Typography>
          </Paper>
        )}
      </Stack>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
            size="medium"
          />
        </Box>
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
        onConfirm={() => { const id = deleteConfirm.id; handleDeleteConfirm(); handleDelete(id); }}
        onCancel={handleDeleteConfirm}
      />
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
    </Box>
  );
}

/* ---- Create Form ---- */
function CreateDialog({ open, onClose, onSubmit, tags: allTags = [] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState([
    { step_number: 1, description: '', duration_sec: 0, photos: [] },
  ]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [saving, setSaving] = useState(false);

  const updateStep = (idx, field, value) => {
    const next = [...steps];
    next[idx] = { ...next[idx], [field]: value };
    setSteps(next);
  };

  const addStep = () => {
    setSteps(prev => [...prev, {
      step_number: prev.length + 1,
      title: '',
      description: '',
      duration_sec: 0,
      photos: [],
    }]);
  };

  const removeStep = (idx) => {
    setSteps(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 }));
    });
  };

  const addPhoto = async (idx, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const next = [...steps];
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = (h / w) * maxDim; w = maxDim; }
          else { w = (w / h) * maxDim; h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        next[idx] = {
          ...next[idx],
          photos: [...next[idx].photos, {
            display_order: next[idx].photos.length,
            dataUrl,
          }],
        };
        setSteps(next);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (stepIdx, photoIdx) => {
    const next = [...steps];
    const photos = next[stepIdx].photos.filter((_, i) => i !== photoIdx);
    photos.forEach((p, i) => { p.display_order = i; });
    next[stepIdx] = { ...next[stepIdx], photos };
    setSteps(next);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      title,
      description,
      steps: steps.map((s) => ({
        step_number: s.step_number,
        title: s.title,
        description: s.description,
        duration_sec: s.duration_sec,
      })),
    };

    const res = await fetch(`${API}/opls/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const createdOpl = await res.json();

    const stepPhotos = steps.map((s) => ({
      stepId: createdOpl.steps.find(st => st.step_number === s.step_number)?.id,
      photos: s.photos,
    }));

    await onSubmit(createdOpl, stepPhotos, selectedTags);

    setTitle('');
    setDescription('');
    setSelectedTags([]);
    setSteps([
      { step_number: 1, title: '', description: '', duration_sec: 0, photos: [] },
    ]);
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Создать инструкцию OPL</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={{ xs: 2, sm: 2.5 }} sx={{ pt: 1 }}>
          <TextField
            label="Название"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Замена упаковки LU-12"
          />
          <TextField
            label="Описание (необязательно)"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {allTags.length > 0 && (
            <Autocomplete
              multiple
              options={allTags}
              getOptionLabel={(t) => t.name}
              value={allTags.filter(t => selectedTags.includes(t.id))}
              onChange={(_, vals) => setSelectedTags(vals.map(v => v.id))}
              renderInput={(params) => (
                <TextField {...params} label="Теги" size="small" placeholder="Выберите теги" />
              )}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Chip label={option.name} size="small"
                      sx={{ bgcolor: option.color, color: 'white', width: 70, fontWeight: 500 }} />
                    <Typography variant="body2">{option.name}</Typography>
                  </Box>
                </li>
              )}
            />
          )}

          {steps.map((step, idx) => (
            <Paper key={idx} sx={{ p: { xs: 1.5, sm: 2 }, border: '1px solid #e0e0e0', borderRadius: 2, position: 'relative' }}>
              {steps.length > 1 && (
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                  onClick={() => removeStep(idx)}
                >
                  <DeleteIcon fontSize="small" sx={{ color: '#d32f2f' }} />
                </IconButton>
              )}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Шаг {step.step_number}
              </Typography>
              <TextField
                label="Название шага"
                fullWidth
                size="small"
                value={step.title}
                onChange={(e) => updateStep(idx, 'title', e.target.value)}
                sx={{ mb: 1 }}
              />
              <Tooltip title="Поддерживает Markdown (жирный, курсив, списки, код)">
                <TextField
                  label="Подробное описание"
                  fullWidth
                  multiline
                  rows={4}
                  value={step.description}
                  onChange={(e) => updateStep(idx, 'description', e.target.value)}
                  sx={{ mb: 1 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <CodeIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Tooltip>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="Длительность (сек)"
                  type="number"
                  size="small"
                  value={step.duration_sec}
                  onChange={(e) => updateStep(idx, 'duration_sec', parseInt(e.target.value) || 0)}
                  sx={{ width: 140 }}
                />
                <label sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhotoCameraIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">Фото</Typography>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    multiple
                    onChange={(e) => {
                      Array.from(e.target.files).forEach((f) => addPhoto(idx, f));
                    }}
                  />
                </label>
              </Box>

              {step.photos.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  {step.photos.map((p, pi) => (
                    <Box
                      key={pi}
                      sx={{ position: 'relative', width: 80, height: 80, borderRadius: 1 }}
                    >
                      <img
                        src={p.dataUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                      />
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute', top: -6, right: -6,
                          bgcolor: 'white', boxShadow: 2,
                          '&:hover': { bgcolor: '#ffebee' },
                        }}
                        onClick={() => removePhoto(idx, pi)}
                      >
                        <DeleteIcon fontSize="small" sx={{ color: '#d32f2f', fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={addStep}
            sx={{ alignSelf: 'center' }}
          >
            Добавить шаг
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!title.trim() || saving}
        >
          {saving ? 'Сохранение...' : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---- Photo Carousel ---- */
function PhotoCarousel({ photos, photoBaseUrl }) {
  const [idx, setIdx] = useState(0);

  if (!photos || photos.length === 0) return null;

  const go = (dir) => {
    setIdx((i) => (i + dir + photos.length) % photos.length);
  };

  return (
    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', bgcolor: '#f5f5f5', my: 1.5, maxWidth: '100%' }}>
      <Box sx={{
        display: 'flex',
        transition: 'transform 0.3s ease',
        transform: `translateX(-${idx * 100}%)`,
        width: '100%',
      }}>
        {photos.map((p, i) => (
          <Box
            key={p.id}
            sx={{ minWidth: '100%', maxWidth: '100%', aspectRatio: '4/3', overflow: 'hidden' }}
          >
            <img
              src={`${photoBaseUrl}/photos/${p.id}`}
              alt={`Фото ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </Box>
        ))}
      </Box>

      {photos.length > 1 && (
        <>
          <IconButton
            size="small"
            sx={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: 'white' },
            }}
            onClick={() => go(-1)}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            size="small"
            sx={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: 'white' },
            }}
            onClick={() => go(1)}
          >
            <ChevronRightIcon />
          </IconButton>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, pb: 1 }}>
            {photos.map((_, i) => (
              <Box
                key={i}
                sx={{
                  width: i === idx ? 20 : 8, height: 8, borderRadius: 4,
                  bgcolor: i === idx ? 'primary.main' : '#ccc',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

/* ---- OPL Detail ---- */
function OplDetail() {
  const { id } = useParams();
  const [opl, setOpl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSteps, setEditSteps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [confirm, setConfirm] = useState({ open: false, stepId: null, photoId: null, deleteStepIdx: null });
  const [activeStep, setActiveStep] = useState(-1);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const stepsRefs = useRef([]);
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width:900px)');
  const photoBase = `${API}/opls/${id}`;
  const { checkAuth, user } = useAuth();

  useEffect(() => {
    fetch(`${API}/opls/${id}`)
      .then((r) => r.json())
      .then((data) => { setOpl(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const startEdit = () => {
    setEditTitle(opl.title);
    setEditDescription(opl.description || '');
    setEditSteps(opl.steps.map(s => ({ ...s })));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/opls/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDescription }),
      });
      for (const step of editSteps) {
        await fetch(`${API}/opls/${id}/steps/${step.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step_number: step.step_number,
            title: step.title,
            description: step.description,
            duration_sec: step.duration_sec,
          }),
        });
      }
      const res = await fetch(`${API}/opls/${id}`);
      const data = await res.json();
      setOpl(data);
      setEditing(false);
      setSnack({ open: true, msg: 'Изменения сохранены', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: 'Ошибка сохранения', severity: 'error' });
    }
    setSaving(false);
  };

  const updateEditStep = (idx, field, value) => {
    const next = [...editSteps];
    next[idx] = { ...next[idx], [field]: value };
    setEditSteps(next);
  };

  const handleDragStart = (idx) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const next = [...editSteps];
    const [dragged] = next.splice(draggedIdx, 1);
    next.splice(targetIdx, 0, dragged);
    setEditSteps(next.map((s, i) => ({ ...s, step_number: i + 1 })));
    setDraggedIdx(targetIdx);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const deleteEditStep = (idx) => {
    setEditSteps(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 }));
      return next;
    });
  };

  const deletePhoto = async (stepId, photoId) => {
    setConfirm({ open: true, stepId, photoId });
  };

  const confirmDeletePhoto = async () => {
    if (!confirm.stepId || !confirm.photoId) return;
    await fetch(`${API}/steps/${confirm.stepId}/photos/${confirm.photoId}`, { method: 'DELETE' });
    const res = await fetch(`${API}/opls/${id}`);
    const data = await res.json();
    setOpl(data);
    setConfirm({ open: false, stepId: null, photoId: null });
  };

  const uploadPhotoToStep = async (stepIdx, file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const blob = await (await fetch(e.target.result)).blob();
      const form = new FormData();
      form.append('file', blob, `photo.jpg`);
      const step = editSteps[stepIdx];
      await fetch(`${API}/opls/${id}/steps/${step.id}/photos?order=${step.photos.length}`, {
        method: 'POST',
        body: form,
      });
      const res = await fetch(`${API}/opls/${id}`);
      const data = await res.json();
      setOpl(data);
      setEditSteps(data.steps.map(s => ({ ...s })));
    };
    reader.readAsDataURL(file);
  };

  const scrollToStep = (stepIdx) => {
    setActiveStep(stepIdx);
    if (stepsRefs.current[stepIdx]) {
      stepsRefs.current[stepIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const replacePhoto = async (stepId, photoId, file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const blob = await (await fetch(e.target.result)).blob();
      const form = new FormData();
      form.append('file', blob, `photo.jpg`);
      await fetch(`${API}/opls/${id}/steps/${stepId}/photos/${photoId}`, {
        method: 'PUT',
        body: form,
      });
      const res = await fetch(`${API}/opls/${id}`);
      const data = await res.json();
      setOpl(data);
      setEditSteps(data.steps.map(s => ({ ...s })));
    };
    reader.readAsDataURL(file);
  };

  if (loading) return (
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
  if (!opl) return <Typography sx={{ px: { xs: 2, sm: 3 }, mt: 2 }}>Не найдена</Typography>;

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m} мин ${s > 0 ? `${s} сек` : ''}` : `${s} сек`;
  };

  if (editing) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 1.5, sm: 3 } }}>
          <IconButton size="small" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant={{ xs: 'h6', sm: 'h5' }} sx={{ fontWeight: 700, flex: 1 }}>
            Редактирование
          </Typography>
        </Box>

        <TextField
          label="Название"
          fullWidth
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Описание"
          fullWidth
          multiline
          rows={2}
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          sx={{ mb: { xs: 2, sm: 3 } }}
        />

        <Stack spacing={{ xs: 1, sm: 2 }}>
          {editSteps.sort((a, b) => a.step_number - b.step_number).map((step, idx) => (
            <Card
              key={step.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              sx={{
                borderRadius: 2,
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                cursor: draggedIdx === idx ? 'grabbing' : 'grab',
                opacity: draggedIdx === idx ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <DragIndicatorIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '50%',
                    bgcolor: 'primary.main', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 16,
                  }}>
                    {step.step_number}
                  </Box>
                  <TextField
                    label="Номер шага"
                    type="number"
                    size="small"
                    value={step.step_number}
                    onChange={(e) => updateEditStep(idx, 'step_number', parseInt(e.target.value) || 0)}
                    sx={{ width: 100 }}
                  />
                  {editSteps.length > 1 && (
                    <IconButton
                      size="small"
                      sx={{ ml: 'auto' }}
                      onClick={() => deleteEditStep(idx)}
                    >
                      <DeleteIcon fontSize="small" sx={{ color: '#d32f2f' }} />
                    </IconButton>
                  )}
                </Box>
                <TextField
                  label="Название шага"
                  fullWidth
                  size="small"
                  value={step.title}
                  onChange={(e) => updateEditStep(idx, 'title', e.target.value)}
                  sx={{ mb: 1 }}
                />
                <Tooltip title="Поддерживает Markdown (жирный, курсив, списки, код)">
                  <TextField
                    label="Подробное описание"
                    fullWidth
                    multiline
                    rows={4}
                    value={step.description}
                    onChange={(e) => updateEditStep(idx, 'description', e.target.value)}
                    sx={{ mb: 1 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <CodeIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Tooltip>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    label="Длительность (сек)"
                    type="number"
                    size="small"
                    value={step.duration_sec}
                    onChange={(e) => updateEditStep(idx, 'duration_sec', parseInt(e.target.value) || 0)}
                    sx={{ width: 140 }}
                  />
                  <label sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PhotoCameraIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">Фото</Typography>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      multiple
                      onChange={(e) => {
                        Array.from(e.target.files).forEach((f) => uploadPhotoToStep(idx, f));
                      }}
                    />
                  </label>
                </Box>

                {step.photos.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    {step.photos.map((p, pi) => (
                      <Box
                        key={pi}
                        sx={{ position: 'relative', width: 80, height: 80, borderRadius: 1 }}
                      >
                        <img
                          src={`${photoBase}/photos/${p.id}`}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                        />
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute', top: -6, right: -6,
                            bgcolor: 'white', boxShadow: 2,
                            '&:hover': { bgcolor: '#ffebee' },
                          }}
                          onClick={() => deletePhoto(step.id, p.id)}
                        >
                          <DeleteIcon fontSize="small" sx={{ color: '#d32f2f', fontSize: 14 }} />
                        </IconButton>
                        <label
                          style={{
                            position: 'absolute', bottom: -6, left: -6,
                            cursor: 'pointer', width: 24, height: 24, borderRadius: '50%',
                            background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <EditIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => {
                              if (e.target.files[0]) replacePhoto(step.id, p.id, e.target.files[0]);
                            }}
                          />
                        </label>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Box sx={{ display: 'flex', gap: 2, mt: { xs: 2, sm: 3 } }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<CheckIcon />}
            onClick={saveEdit}
            disabled={!editTitle.trim() || saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Button
            size="small"
            startIcon={<CancelIcon />}
            onClick={cancelEdit}
            disabled={saving}
          >
            Отмена
          </Button>
        </Box>

        <Snackbar
          open={snack.open}
          autoHideDuration={3000}
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconButton size="small" onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Breadcrumbs separator="›" sx={{ fontSize: '0.8rem' }}>
          <MuiLink component={Link} to="/" underline="hover" sx={{ color: 'text.secondary' }}>
            OPL
          </MuiLink>
          <Typography variant="body2" color="text.primary">{opl.title}</Typography>
        </Breadcrumbs>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 1.5, sm: 3 } }}>
        <Typography variant={{ xs: 'h6', sm: 'h5' }} sx={{ fontWeight: 700, flex: 1 }}>
          {opl.title}
        </Typography>
        <IconButton size="small" onClick={() => window.open(`${API}/opls/${id}/pdf`, '_blank')}>
          <PictureAsPdfIcon />
        </IconButton>
        <IconButton size="small" onClick={() => setQrOpen(true)}>
          <QrCodeIcon />
        </IconButton>
        {user ? (
          <Tooltip title="Редактировать" arrow>
            <IconButton size="small" onClick={() => startEdit()}>
              <EditIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Войдите, чтобы редактировать" arrow>
            <IconButton size="small" disabled>
              <EditIcon sx={{ color: '#ccc' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {opl.description && (
        <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 1.5, sm: 3 }, bgcolor: '#f9fbe7', borderRadius: 2 }}>
          <Typography variant="body2">{opl.description}</Typography>
        </Paper>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: { xs: 2, sm: 3 } }} alternativeLabel>
        {opl.steps.map((s, idx) => (
          <Step key={s.id} active={activeStep === idx} completed={idx < activeStep}>
            <StepLabel
              onClick={() => scrollToStep(idx)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Шаг {s.step_number}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Stack spacing={{ xs: 1, sm: 2 }}>
        {opl.steps.sort((a, b) => a.step_number - b.step_number).map((step, idx) => (
          <div ref={(el) => (stepsRefs.current[idx] = el)}>
            <Card
              key={step.id}
              sx={{
                borderRadius: 2,
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }}
            >
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%',
                  bgcolor: 'primary.main', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 16,
                }}>
                  {step.step_number}
                </Box>
                <Box sx={{ flex: 1 }}>
                  {step.title && (
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {step.title}
                    </Typography>
                  )}
                  {step.description_html && (
                    <Box sx={{
                      '& p': { margin: 0 },
                      '& ul, & ol': { margin: 0, paddingLeft: 16 },
                      '& ul ul, & ol ol, & ul ol, & ol ul': { paddingLeft: 12 },
                      '& pre': { bgcolor: '#f5f5f5', p: 1, borderRadius: 1, overflow: 'auto', mt: 1 },
                      '& code': { bgcolor: '#f5f5f5', px: 0.5, borderRadius: 1 },
                      '& blockquote': { borderLeft: '3px solid #ccc', pl: 1, color: 'text.secondary', margin: 0 },
                      '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 1, mb: 0.5 },
                      '& hr': { my: 1 },
                    }} dangerouslySetInnerHTML={{ __html: step.description_html }} />
                  )}
                </Box>
                <Chip
                  icon={<TimerIcon sx={{ fontSize: 16 }} />}
                  label={formatDuration(step.duration_sec)}
                  size="small"
                  variant="outlined"
                />
              </Box>

              <PhotoCarousel photos={step.photos} photoBaseUrl={photoBase} />
            </CardContent>
          </Card>
          </div>
        ))}
      </Stack>

      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Поделиться инструкцией</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'inline-block', p: 2, bgcolor: 'white', borderRadius: 2 }}>
            <QRCodeSVG value={`${APP_URL}/opl/${id}`} size={220} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Отсканируйте QR-код для открытия инструкции на устройстве
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center', px: 2 }}>
            <TextField
              size="small"
              value={`${APP_URL}/opl/${id}`}
              fullWidth
              InputProps={{ readOnly: true }}
              sx={{ maxWidth: 360 }}
            />
            <IconButton
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(`${APP_URL}/opl/${id}`);
                setSnack({ open: true, msg: 'Ссылка скопирована', severity: 'success' });
              }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={confirm.open}
        title="Удалить фото?"
        message="Это действие нельзя отменить."
        onConfirm={confirmDeletePhoto}
        onCancel={() => setConfirm({ open: false, stepId: null, photoId: null })}
      />
    </Box>
  );
}

/* ---- Main App ---- */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppInner() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <CssBaseline />
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#1565c0' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ fontWeight: 600, color: 'inherit', textDecoration: 'none', flexGrow: 1 }}
          >
            OPL Инструкции
          </Typography>
          <HeaderUserArea />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: { xs: 1, sm: 3 }, mb: { xs: 2, sm: 4 }, px: { xs: 1, sm: 2 } }}>
        <Routes>
          <Route path="/" element={<OplList />} />
          <Route path="/opl/:id" element={<OplDetail />} />
        </Routes>
      </Container>
      <AuthDialog />
    </Box>
  );
}
