import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { ThemeProvider, theme } from './components/layout/AppLayout';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider, AuthDialog, useAuth } from './components/auth/AuthProvider';
import { CollectionsProvider } from './contexts/CollectionsContext';
import OplList from './components/opl/OplList';
import OplDetail from './components/opl/OplDetail';

function AppInner() {
  const { loading, welcomeToast, setWelcomeToast } = useAuth();

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AppLayout welcomeToast={welcomeToast} setWelcomeToast={setWelcomeToast}>
      <Suspense fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      }>
        <Routes>
          <Route path="/" element={<OplList />} />
          <Route path="/opl/:id" element={<OplDetail />} />
        </Routes>
      </Suspense>
      <AuthDialog />
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <CollectionsProvider>
            <AppInner />
          </CollectionsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
