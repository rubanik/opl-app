import React, { useState, useEffect, useCallback, createContext } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button,
  Typography,
  InputAdornment,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Alert,
  Avatar,
  Box,
} from '@mui/material';
import { Link as MuiLink } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const API = '/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [requireAuth, setRequireAuth] = useState(false);
  const [welcomeToast, setWelcomeToast] = useState({ open: false, username: '' });

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
    setRequireAuth(true);
    setPendingAction(onRequireAuth);
    setAuthOpen(true);
    return false;
  }, [user]);

  const login = async (credentials) => {
    const wasRequired = requireAuth;
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
    setRequireAuth(false);
    if (!wasRequired) {
      setWelcomeToast({ open: true, username: data.user.username });
    }
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
    <AuthContext.Provider value={{
      user, loading, authOpen, setAuthOpen, pendingAction, requireAuth,
      checkAuth, login, register, logout, welcomeToast, setWelcomeToast,
      setRequireAuth, setPendingAction,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/* ---- Auth Dialog ---- */
export function AuthDialog() {
  const { authOpen, setAuthOpen, pendingAction, requireAuth, login, register, setPendingAction } = useAuth();
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

  const handleClose = () => {
    setAuthOpen(false);
    if (pendingAction) setPendingAction(null);
  };

  const handleTabChange = (_, v) => {
    setTabValue(v);
    setMode(v === 0 ? 'login' : 'register');
    setError('');
  };

  return (
    <Dialog open={authOpen} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="Вход" />
          <Tab label="Регистрация" />
        </Tabs>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {requireAuth && (
            <Alert severity="info">Для этого действия нужна авторизация</Alert>
          )}
          {error && (
            <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
          )}
          <TextField
            label="Логин"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Например: aivanov"
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
        <Button onClick={handleClose}>Отмена</Button>
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
export function HeaderUserArea() {
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
