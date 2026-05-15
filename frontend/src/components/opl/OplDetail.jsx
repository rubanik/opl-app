import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Stack,
  Chip,
  Step,
  StepLabel,
  Stepper,
  Paper,
  Snackbar,
  Alert,
  Tooltip,
  InputAdornment,
  IconButton,
  Skeleton,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
  Divider,
  Avatar,
} from '@mui/material';
import { Link as MuiLink } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import TimerIcon from '@mui/icons-material/Timer';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CodeIcon from '@mui/icons-material/Code';
import DescriptionIcon from '@mui/icons-material/Description';
import { QRCodeSVG } from 'qrcode.react';

import PhotoCarousel from './PhotoCarousel';
import ConfirmDialog from '../common/ConfirmDialog';
import { useAuth } from '../auth/AuthProvider';
import { useApi } from '../../hooks/useApi';

const API = '/api';
const APP_URL = window.location.origin;

export default function OplDetail() {
  const { id } = useParams();
  const [opl, setOpl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSteps, setEditSteps] = useState([]);
  const [editTags, setEditTags] = useState([]);
  const [editSelectedTagIds, setEditSelectedTagIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [confirm, setConfirm] = useState({ open: false, stepId: null, photoId: null });
  const [deleteOplConfirm, setDeleteOplConfirm] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const stepsRefs = useRef([]);
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width:900px)');
  const isMobile = useMediaQuery('(max-width:600px)');
  const photoBase = `${API}/opls/${id}`;
  const { checkAuth, user } = useAuth();
  const { del: apiDelete, toast: apiToast, setToast: setApiToast } = useApi();

  useEffect(() => {
    fetch(`${API}/opls/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => { setOpl(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [id]);

  const startEdit = async () => {
    checkAuth(() => {
      setEditTitle(opl.title);
      setEditDescription(opl.description || '');
      setEditSteps(opl.steps.map(s => ({ ...s, photos: s.photos || [] })));
      setEditSelectedTagIds(opl.tags.map(t => t.id));
      fetch(`${API}/opls/tags`).then(r => r.json()).then(setEditTags);
      setEditing(true);
    });
  };

  const handleDeleteOpl = async () => {
    setDeleteOplConfirm(false);
    await apiDelete(`/opls/${id}`);
    navigate('/');
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
      return prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 }));
    });
  };

  const deletePhoto = (stepId, photoId) => {
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

  const uploadPhotoToStep = async (step, file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const blob = await (await fetch(e.target.result)).blob();
      const form = new FormData();
      form.append('file', blob, 'photo.jpg');
      await fetch(`${API}/opls/${id}/steps/${step.id}/photos?order=${(step.photos || []).length}`, {
        method: 'POST',
        body: form,
      });
      const res = await fetch(`${API}/opls/${id}`);
      const data = await res.json();
      setOpl(data);
      setEditSteps(data.steps.map(s => ({ ...s, photos: s.photos || [] })));
    };
    reader.readAsDataURL(file);
  };

  const addEditStep = async () => {
    const maxStep = editSteps.reduce((max, s) => Math.max(max, s.step_number), 0);
    const payload = { step_number: maxStep + 1, title: '', description: '', duration_sec: 0, photos: [] };
    const res = await fetch(`${API}/opls/${id}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const newStep = await res.json();
    setEditSteps(prev => [...prev, { ...newStep, photos: [] }]);
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
      form.append('file', blob, 'photo.jpg');
      await fetch(`${API}/opls/${id}/steps/${stepId}/photos/${photoId}`, {
        method: 'PUT',
        body: form,
      });
      const res = await fetch(`${API}/opls/${id}`);
      const data = await res.json();
      setOpl(data);
      setEditSteps(data.steps.map(s => ({ ...s, photos: s.photos || [] })));
    };
    reader.readAsDataURL(file);
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m} мин ${s > 0 ? `${s} сек` : ''}` : `${s} сек`;
  };

  const totalDuration = opl?.steps.reduce((acc, s) => acc + (s.duration_sec || 0), 0) || 0;

  // Loading state
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

  // Error state
  if (error || !opl) return (
    <Box sx={{ px: { xs: 2, sm: 3 }, mt: 4, textAlign: 'center' }}>
      <DescriptionIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h6" sx={{ mb: 1 }}>Инструкция не найдена</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Возможно, она была удалена или вы опечатались в ссылке.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')} sx={{ borderRadius: 2 }}>
        На главную
      </Button>
    </Box>
  );

  // Editing mode
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
          {user && (
            <Tooltip title="Удалить инструкцию" arrow>
              <IconButton size="small" onClick={() => setDeleteOplConfirm(true)} sx={{ color: 'error.main' }}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <TextField
          label="Название"
          fullWidth
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          sx={{ mb: 2, borderRadius: 2 }}
        />
        <TextField
          label="Описание"
          fullWidth
          multiline
          rows={2}
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          sx={{ mb: { xs: 2, sm: 3 }, borderRadius: 2 }}
        />

        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          {editSteps.sort((a, b) => a.step_number - b.step_number).map((step, idx) => (
            <Card
              key={step.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              sx={{
                borderRadius: 2,
                boxShadow: draggedIdx === idx ? '0 4px 16px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.1)',
                cursor: draggedIdx === idx ? 'grabbing' : 'grab',
                opacity: draggedIdx === idx ? 0.5 : 1,
                transition: 'all 0.2s',
                border: draggedIdx === idx ? '2px dashed primary.main' : 'none',
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <DragIndicatorIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
                  <Avatar sx={{
                    width: 32, height: 32, bgcolor: 'primary.main',
                    fontSize: 14, fontWeight: 700,
                  }}>
                    {step.step_number}
                  </Avatar>
                  <TextField
                    label="Название шага"
                    fullWidth
                    size="small"
                    value={step.title}
                    onChange={(e) => updateEditStep(idx, 'title', e.target.value)}
                    sx={{ borderRadius: 1 }}
                  />
                  {editSteps.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => deleteEditStep(idx)}
                      sx={{ ml: 'auto', color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <Tooltip title="Поддерживает Markdown">
                  <TextField
                    label="Подробное описание"
                    fullWidth
                    multiline
                    rows={4}
                    value={step.description}
                    onChange={(e) => updateEditStep(idx, 'description', e.target.value)}
                    sx={{ mb: 1, borderRadius: 1 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <CodeIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Tooltip>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    label="Длительность (сек)"
                    type="number"
                    size="small"
                    value={step.duration_sec}
                    onChange={(e) => updateEditStep(idx, 'duration_sec', parseInt(e.target.value) || 0)}
                    sx={{ width: 130, borderRadius: 1 }}
                  />
                  <input
                    id={`photo-upload-${step.id}`}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    multiple
                    onChange={(e) => {
                      Array.from(e.target.files).forEach((f) => uploadPhotoToStep(step, f));
                      e.target.value = '';
                    }}
                  />
                  <label
                    htmlFor={`photo-upload-${step.id}`}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderRadius: 2, px: 1.5, py: 0.5, bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}>
                      <PhotoCameraIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Typography variant="body2" color="text.secondary">Фото</Typography>
                    </Box>
                  </label>
                </Box>

                {step.photos && step.photos.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    {step.photos.map((p, pi) => (
                      <Box
                        key={pi}
                        sx={{ position: 'relative', width: 80, height: 80, borderRadius: 1.5, overflow: 'hidden' }}
                      >
                        <img
                          src={`${photoBase}/photos/${p.id}`}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute', top: -4, right: -4,
                            width: 22, height: 22, bgcolor: 'white', boxShadow: 2,
                          }}
                          onClick={() => deletePhoto(step.id, p.id)}
                        >
                          <DeleteIcon sx={{ fontSize: 14, color: '#d32f2f' }} />
                        </IconButton>
                        <input
                          id={`replace-photo-${step.id}-${p.id}`}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files[0]) replacePhoto(step.id, p.id, e.target.files[0]);
                            e.target.value = '';
                          }}
                        />
                        <label
                          htmlFor={`replace-photo-${step.id}-${p.id}`}
                          style={{
                            position: 'absolute', bottom: -4, left: -4,
                            cursor: 'pointer', width: 22, height: 22, borderRadius: '50%',
                            background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <EditIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                        </label>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addEditStep}
          sx={{ alignSelf: 'center', borderRadius: 2, my: 1 }}
        >
          Добавить шаг
        </Button>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<CheckIcon />}
            onClick={saveEdit}
            disabled={!editTitle.trim() || saving}
            sx={{ borderRadius: 2 }}
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

  // View mode
  return (
    <Box>
      {/* Breadcrumbs + back */}
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

      {/* Title + actions */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: { xs: 1.5, sm: 2.5 } }}>
        <Typography variant={{ xs: 'h6', sm: 'h5' }} sx={{ fontWeight: 700, flex: 1 }}>
          {opl.title}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Скачать PDF" arrow>
            <IconButton size="small" onClick={() => window.open(`${API}/opls/${id}/pdf`, '_blank')}>
              <PictureAsPdfIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="QR-код" arrow>
            <IconButton size="small" onClick={() => setQrOpen(true)}>
              <QrCodeIcon />
            </IconButton>
          </Tooltip>
          {user ? (
            <Tooltip title="Редактировать" arrow>
              <IconButton size="small" onClick={() => startEdit()}>
                <EditIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Войдите, чтобы редактировать" arrow>
              <IconButton size="small" onClick={() => checkAuth(() => startEdit())}>
                <EditIcon sx={{ color: 'text.disabled' }} />
              </IconButton>
            </Tooltip>
          )}
          {user && (
            <Tooltip title="Удалить инструкцию" arrow>
              <IconButton size="small" onClick={() => setDeleteOplConfirm(true)} sx={{ color: 'error.main' }}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* Meta bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 2, mb: { xs: 1.5, sm: 2.5 },
        px: 2, py: 1, borderRadius: 2, bgcolor: 'action.hover',
      }}>
        <Chip
          icon={<TimerIcon sx={{ fontSize: 16 }} />}
          label={`Общее время: ${formatDuration(totalDuration)}`}
          size="small"
          variant="outlined"
        />
        <Chip
          label={`${opl.steps.length} ${getStepWord(opl.steps.length)}`}
          size="small"
          variant="outlined"
        />
        {opl.created_at && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Создано: {new Date(opl.created_at).toLocaleDateString('ru-RU')}
          </Typography>
        )}
      </Box>

      {/* Description */}
      {opl.description && (
        <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 1.5, sm: 2.5 }, bgcolor: '#f9fbe7', borderRadius: 2 }}>
          <Typography variant="body2">{opl.description}</Typography>
        </Paper>
      )}

      {/* Stepper - desktop */}
      {!isMobile && opl.steps.length > 1 && (
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
      )}

      {/* Steps */}
      <Stack spacing={{ xs: 1.5, sm: 2.5 }}>
        {opl.steps.sort((a, b) => a.step_number - b.step_number).map((step, idx) => (
          <div ref={(el) => (stepsRefs.current[idx] = el)} key={step.id}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: activeStep === idx
                  ? '0 2px 12px rgba(25,118,210,0.15)'
                  : '0 1px 4px rgba(0,0,0,0.08)',
                border: activeStep === idx ? '1.5px solid primary.main' : '1.5px solid transparent',
                transition: 'all 0.3s',
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: step.description_html || step.photos?.length ? 1.5 : 0 }}>
                  <Avatar sx={{
                    width: 36, height: 36, minWidth: 36,
                    bgcolor: 'primary.main', color: 'white',
                    fontWeight: 700, fontSize: 15,
                  }}>
                    {step.step_number}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    {step.title && (
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {step.title}
                      </Typography>
                    )}
                    {step.description_html && (
                      <Box sx={{
                        '& p': { margin: 0 },
                        '& ul, & ol': { margin: 0, paddingLeft: 12 },
                        '& ul ul, & ol ol, & ul ol, & ol ul': { paddingLeft: 8 },
                        '& pre': { bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1.5, overflow: 'auto', mt: 1, fontSize: '0.85rem' },
                        '& code': { bgcolor: '#f5f5f5', px: 0.5, py: 0.2, borderRadius: 1, fontSize: '0.85rem' },
                        '& blockquote': { borderLeft: '3px solid #ccc', pl: 1, color: 'text.secondary', margin: 0 },
                        '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 1, mb: 0.5 },
                        '& hr': { my: 1 },
                        '& a': { color: 'primary.main' },
                        '& table': { borderCollapse: 'collapse', width: '100%', mt: 1 },
                        '& th, & td': { border: '1px solid #e0e0e0', p: 0.75, textAlign: 'left' },
                        '& th': { bgcolor: '#f5f5f5', fontWeight: 600 },
                      }} dangerouslySetInnerHTML={{ __html: step.description_html }} />
                    )}
                  </Box>
                  <Chip
                    icon={<TimerIcon sx={{ fontSize: 14 }} />}
                    label={formatDuration(step.duration_sec)}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 'auto', flexShrink: 0 }}
                  />
                </Box>

                {step.photos?.length > 0 && (
                  <PhotoCarousel photos={step.photos} photoBaseUrl={photoBase} />
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </Stack>

      {/* QR Dialog */}
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Поделиться инструкцией</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
          <Box sx={{ display: 'inline-block', p: 2, bgcolor: 'white', borderRadius: 3, boxShadow: 2 }}>
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
              sx={{ maxWidth: 360, borderRadius: 1 }}
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
          <Button onClick={() => setQrOpen(false)} sx={{ borderRadius: 1 }}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm delete photo */}
      <ConfirmDialog
        open={confirm.open}
        title="Удалить фото?"
        message="Это действие нельзя отменить."
        onConfirm={confirmDeletePhoto}
        onCancel={() => setConfirm({ open: false, stepId: null, photoId: null })}
      />

      {/* Confirm delete OPL */}
      <ConfirmDialog
        open={deleteOplConfirm}
        title="Удалить инструкцию?"
        message={`Вы уверены, что хотите удалить «${opl.title}»? Это действие нельзя отменить.`}
        onConfirm={handleDeleteOpl}
        onCancel={() => setDeleteOplConfirm(false)}
      />

      {/* Toasts */}
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

function getStepWord(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'шагов';
  if (mod10 === 1) return 'шаг';
  if (mod10 >= 2 && mod10 <= 4) return 'шага';
  return 'шагов';
}
