import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Snackbar,
  Alert,
  useMediaQuery,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { HeaderUserArea } from '../auth/AuthProvider';
import CollectionSelector from '../collections/CollectionSelector';

const theme = createTheme({
  palette: {
    primary: { main: '#1565c0', lighter: '#e3f2fd' },
    secondary: { main: '#ff9800' },
    background: { default: '#f5f5f5' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: 'box-shadow 0.2s',
          '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
  },
});

export default function AppLayout({ children, welcomeToast, setWelcomeToast }) {
  const isMobile = useMediaQuery('(max-width:600px)');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />
      <AppBar position="fixed" elevation={0} sx={{
        bgcolor: 'primary.main',
      }}>
        <Toolbar>
          <Typography
            variant={isMobile ? 'subtitle1' : 'h6'}
            component={RouterLink}
            to="/"
            sx={{
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
              flexGrow: 1,
              letterSpacing: 0.5,
            }}
          >
            OPL Инструкции
          </Typography>
          <CollectionSelector isMobile={isMobile} />
          <HeaderUserArea />
        </Toolbar>
      </AppBar>

      <Box sx={{
        pt: { xs: 10, sm: 12 },
        pb: 3,
        px: { xs: 1.5, sm: 3 },
        maxWidth: '1200px',
        mx: 'auto',
        minHeight: 'calc(100vh - 64px)',
      }}>
        {children}
      </Box>

      <Snackbar
        open={welcomeToast.open}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClose={() => setWelcomeToast({ ...welcomeToast, open: false })}
        sx={{ zIndex: 9999 }}
      >
        <Alert severity="success" onClose={() => setWelcomeToast({ ...welcomeToast, open: false })} elevation={3}>
          Вы успешно вошли в систему
        </Alert>
      </Snackbar>
    </Box>
  );
}

export { theme, ThemeProvider };
