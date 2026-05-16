import React, { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export default function PhotoCarousel({ photos, photoBaseUrl }) {
  const [idx, setIdx] = useState(0);

  if (!photos || photos.length === 0) return null;

  const go = (dir) => {
    setIdx((i) => (i + dir + photos.length) % photos.length);
  };

  return (
    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', bgcolor: '#f5f5f5', my: 1.5, maxWidth: { xs: '100%', sm: 600 }, mx: { xs: 0, sm: 'auto' } }}>
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
