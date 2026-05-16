import React from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import DeleteIcon from '@mui/icons-material/Delete';
import TimerIcon from '@mui/icons-material/Timer';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DescriptionIcon from '@mui/icons-material/Description';

export default function OplCard({ opl, onDelete, user }) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');

  const totalDuration = opl.total_duration_sec || 0;

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m} мин ${s > 0 ? `${s} сек` : ''}` : `${s} сек`;
  };

  const stepWord = (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return 'шагов';
    if (mod10 === 1) return 'шаг';
    if (mod10 >= 2 && mod10 <= 4) return 'шага';
    return 'шагов';
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          transform: 'translateY(-1px)',
        },
      }}
      onClick={() => navigate(`/opl/${opl.id}`)}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2,
              bgcolor: 'primary.lighter', color: 'primary.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <DescriptionIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography
                variant={{ xs: 'subtitle1', sm: 'h6' }}
                sx={{
                  fontWeight: 600, lineHeight: 1.3,
                  display: { xs: '-webkit-box', sm: 'block' },
                  overflow: 'hidden',
                  WebkitLineClamp: { xs: 2, sm: 0 },
                  WebkitBoxOrient: { xs: 'vertical', sm: '' },
                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                }}
              >
                {opl.title}
              </Typography>
              <NavigateNextIcon sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />
            </Box>

            {opl.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {opl.description}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
              {opl.author && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.5 }}>
                  <Avatar sx={{ width: 20, height: 20, fontSize: '0.6rem', bgcolor: 'grey.300', color: 'grey.700' }}>
                    {(() => {
                      const sn = (opl.author.surname || '').slice(0, 1).toUpperCase();
                      const gn = (opl.author.given_name || '').slice(0, 1).toUpperCase();
                      return (sn + gn) || opl.author.username.slice(0, 2).toUpperCase();
                    })()}
                  </Avatar>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                    {(() => {
                      const sn = opl.author.surname || '';
                      const gn = opl.author.given_name || '';
                      if (sn && gn) return `${sn} ${gn[0]}.`;
                      if (sn) return sn;
                      return opl.author.username;
                    })()}
                  </Typography>
                </Box>
              )}
              {(opl.tags || []).map(tag => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  sx={{
                    bgcolor: tag.color, color: 'white',
                    fontWeight: 500, fontSize: '0.7rem', height: 22,
                    borderRadius: 1,
                  }}
                />
              ))}
              <Chip
                label={`${opl.step_count} ${stepWord(opl.step_count)}`}
                size="small"
                sx={{
                  bgcolor: '#e3f2fd', color: '#1565c0',
                  fontWeight: 500, fontSize: '0.7rem', height: 22,
                  borderRadius: 1,
                }}
              />
              {opl.total_duration_sec > 0 && (
                <Chip
                  icon={<TimerIcon sx={{ fontSize: 12 }} />}
                  label={formatDuration(opl.total_duration_sec)}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 22, borderRadius: 1 }}
                />
              )}
              {!isMobile && (
                <Chip
                  label={new Date(opl.created_at).toLocaleDateString('ru-RU')}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 22, borderRadius: 1, color: 'text.secondary' }}
                />
              )}
            </Box>
          </Box>

          {user && (
            <Tooltip title="Удалить" arrow>
              <IconButton
                size="small"
                sx={{
                  color: 'text.disabled',
                  ml: 'auto', flexShrink: 0,
                  '&:hover': { color: 'error.main', bgcolor: '#ffebee' },
                }}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(opl.id); }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
