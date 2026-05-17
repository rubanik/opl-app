import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button,
  Typography,
  Paper,
  Tooltip,
  InputAdornment,
  IconButton,
  Autocomplete,
  Chip,
  Box,
  Avatar,
  Divider,
  Fab,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CodeIcon from '@mui/icons-material/Code';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FolderIcon from '@mui/icons-material/Folder';

const API = '/api';

export default function CreateDialog({ open, onClose, onSubmit, tags: allTags = [], collections: allCollections = [] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState([
    { step_number: 1, title: '', description: '', duration_sec: 0, photos: [] },
  ]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const isMobile = useMediaQuery('(max-width:600px)');

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
        const next = [...steps];
        next[idx] = {
          ...next[idx],
          photos: [...next[idx].photos, { display_order: next[idx].photos.length, dataUrl }],
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

  const totalDuration = steps.reduce((acc, s) => acc + (s.duration_sec || 0), 0);

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

    await onSubmit(createdOpl, stepPhotos, selectedTags, selectedCollectionIds);

    setTitle('');
    setDescription('');
    setSelectedTags([]);
    setSelectedCollectionIds([]);
    setSteps([
      { step_number: 1, title: '', description: '', duration_sec: 0, photos: [] },
    ]);
    setSaving(false);
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m} мин ${s > 0 ? `${s} сек` : ''}` : `${s} сек`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="body">
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleOutlineIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Новая инструкция OPL
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <TextField
            label="Название"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Замена упаковки LU-12"
            required
            sx={{ borderRadius: 1 }}
          />
          <Tooltip title="Поддерживает Markdown" arrow>
            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание инструкции (необязательно)"
              sx={{ borderRadius: 1 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <CodeIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Tooltip>
          {allTags.length > 0 && (
            isMobile ? (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Теги
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {allTags.map(tag => {
                    const active = selectedTags.includes(tag.id);
                    return (
                      <Chip
                        key={tag.id}
                        label={tag.name}
                        clickable
                        onClick={() => setSelectedTags(prev =>
                          active ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                        )}
                        sx={{
                          bgcolor: active ? tag.color : 'transparent',
                          color: active ? 'white' : tag.color,
                          fontWeight: active ? 600 : 400,
                          border: `1.5px solid ${tag.color}`,
                          borderRadius: 2,
                          transition: 'all 0.15s',
                          px: 1.5,
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            ) : (
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
                      <Chip
                        label={option.name}
                        size="small"
                        sx={{ bgcolor: option.color, color: 'white', width: 70, fontWeight: 500, borderRadius: 1 }}
                      />
                      <Typography variant="body2">{option.name}</Typography>
                    </Box>
                  </li>
                )}
              />
            )
          )}

          {allCollections.length > 0 && (
            isMobile ? (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Коллекции
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {allCollections.map(coll => {
                    const active = selectedCollectionIds.includes(coll.id);
                    return (
                      <Chip
                        key={coll.id}
                        label={coll.title}
                        size="small"
                        icon={<FolderIcon sx={{ fontSize: 14, color: active ? 'white' : 'primary.main' }} />}
                        clickable
                        onClick={() => setSelectedCollectionIds(prev =>
                          active ? prev.filter(c => c !== coll.id) : [...prev, coll.id]
                        )}
                        variant={active ? 'filled' : 'outlined'}
                        sx={{
                          bgcolor: active ? 'primary.main' : 'transparent',
                          color: active ? 'white' : 'text.primary',
                          fontWeight: active ? 600 : 400,
                          borderColor: 'primary.main',
                          borderRadius: 2,
                          transition: 'all 0.15s',
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            ) : (
              <Autocomplete
                multiple
                options={allCollections}
                getOptionLabel={(c) => c.title}
                value={allCollections.filter(c => selectedCollectionIds.includes(c.id))}
                onChange={(_, vals) => setSelectedCollectionIds(vals.map(v => v.id))}
                renderInput={(params) => (
                  <TextField {...params} label="Коллекции" size="small" placeholder="Выберите коллекции" />
                )}
                renderOption={(props, option, { selected }) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <FolderIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Typography variant="body2">{option.title}</Typography>
                    </Box>
                  </li>
                )}
              />
            )
          )}

          <Divider />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Шаги ({steps.length})
            </Typography>
            {totalDuration > 0 && (
              <Chip
                icon={<TimerIcon sx={{ fontSize: 14 }} />}
                label={formatDuration(totalDuration)}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          {steps.map((step, idx) => (
            <Paper
              key={idx}
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                position: 'relative',
              }}
            >
              {steps.length > 1 && (
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 8, color: 'error.main' }}
                  onClick={() => removeStep(idx)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Avatar sx={{
                  width: 28, height: 28, bgcolor: 'primary.main',
                  fontSize: 13, fontWeight: 700,
                }}>
                  {step.step_number}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Шаг {step.step_number}
                </Typography>
              </Box>
              <TextField
                label="Название шага"
                fullWidth
                size="small"
                value={step.title}
                onChange={(e) => updateStep(idx, 'title', e.target.value)}
                sx={{ mb: 1, borderRadius: 1 }}
              />
              <Tooltip title="Поддерживает Markdown">
                <TextField
                  label="Описание"
                  fullWidth
                  multiline
                  rows={4}
                  value={step.description}
                  onChange={(e) => updateStep(idx, 'description', e.target.value)}
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
                  onChange={(e) => updateStep(idx, 'duration_sec', parseInt(e.target.value) || 0)}
                  sx={{ width: 130, borderRadius: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TimerIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <input
                  id={`create-photo-${idx}`}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  multiple
                  onChange={(e) => {
                    Array.from(e.target.files).forEach((f) => addPhoto(idx, f));
                    e.target.value = '';
                  }}
                />
                <label
                  htmlFor={`create-photo-${idx}`}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <IconButton size="small" color="primary">
                    <PhotoCameraIcon />
                  </IconButton>
                  <Typography variant="body2" color="text.secondary">Фото</Typography>
                </label>
              </Box>

              {step.photos.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5, flexWrap: 'wrap' }}>
                  {step.photos.map((p, pi) => (
                    <Box
                      key={pi}
                      sx={{
                        position: 'relative', width: 72, height: 72,
                        borderRadius: 1.5, overflow: 'hidden',
                      }}
                    >
                      <img
                        src={p.dataUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute', top: -4, right: -4,
                          width: 20, height: 20, bgcolor: 'white', boxShadow: 2,
                        }}
                        onClick={() => removePhoto(idx, pi)}
                      >
                        <DeleteIcon sx={{ fontSize: 12, color: '#d32f2f' }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          ))}

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addStep}
            sx={{ alignSelf: 'center', borderRadius: 2 }}
          >
            Добавить шаг
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 1 }}>Отмена</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!title.trim() || saving}
          sx={{ borderRadius: 2 }}
        >
          {saving ? 'Создание...' : 'Создать инструкцию'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
