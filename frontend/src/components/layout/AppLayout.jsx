import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  IconButton,
  Snackbar,
  Alert,
  useMediaQuery,
  ThemeProvider,
  createTheme,
  Drawer,
  Drawer as MuiDrawer,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { HeaderUserArea } from '../auth/AuthProvider';
import CollectionSidebar from '../collections/CollectionSidebar';

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

const DRAWER_WIDTH = 240;

export default function AppLayout({ children, welcomeToast, setWelcomeToast }) {
  const isMobile = useMediaQuery('(max-width:600px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />
      <AppBar position="fixed" elevation={0} sx={{
        bgcolor: 'primary.main',
        ml: { sm: sidebarOpen ? DRAWER_WIDTH : 0 },
        transition: 'margin 0.2s',
      }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            sx={{ mr: 1 }}
          >
            {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
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
          <HeaderUserArea />
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', top: 56 },
          }}
        >
          <CollectionSidebar />
        </Drawer>
      ) : (
        <MuiDrawer
          variant="permanent"
          sx={{
            width: sidebarOpen ? DRAWER_WIDTH : 0,
            flexShrink: 0,
            transition: 'width 0.2s',
            '& .MuiDrawer-paper': {
              width: sidebarOpen ? DRAWER_WIDTH : 0,
              overflowX: 'hidden',
              transition: 'width 0.2s',
              top: 64,
              height: 'calc(100% - 64px)',
              borderRight: sidebarOpen ? '1px solid #e0e0e0' : 'none',
            },
          }}
        >
          <CollectionSidebar />
        </MuiDrawer>
      )}

      <Box sx={{
        pt: 8,
        pb: 3,
        px: { xs: 1.5, sm: 3 },
        ml: { sm: sidebarOpen ? DRAWER_WIDTH : 0 },
        maxWidth: { sm: `calc(100% - ${sidebarOpen ? DRAWER_WIDTH : 0}px)` },
        transition: 'all 0.2s',
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
