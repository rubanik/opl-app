import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import DeleteIcon from '@mui/icons-material/Delete';
import TimerIcon from '@mui/icons-material/Timer';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DescriptionIcon from '@mui/icons-material/Description';
import StepIcon from '@mui/icons-material/MenuBook';
import FolderIcon from '@mui/icons-material/Folder';

export default function OplCard({ opl, onDelete, user }) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [tagsAnchor, setTagsAnchor] = useState(null);

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

  const tags = opl.tags || [];
  const showMore = tags.length > 2;
  const visibleTags = showMore ? tags.slice(0, 2) : tags;
  const hiddenCount = showMore ? tags.length - 2 : 0;

  const getAuthorName = () => {
    if (!opl.author) return '';
    const sn = opl.author.surname || '';
    const gn = opl.author.given_name || '';
    if (sn && gn) return `${sn} ${gn[0]}.`;
    if (sn) return sn;
    return opl.author.username;
  };

  const getAuthorInitials = () => {
    if (!opl.author) return '?';
    const sn = (opl.author.surname || '').slice(0, 1).toUpperCase();
    const gn = (opl.author.given_name || '').slice(0, 1).toUpperCase();
    return (sn + gn) || opl.author.username.slice(0, 2).toUpperCase();
  };

  const authorName = getAuthorName();
  const collectionName = opl.collection?.name;

  return (
    <>
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

              {opl.description_html && (
                <div
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: 8,
                    fontSize: 14,
                    color: 'rgba(0, 0, 0, 0.6)',
                    lineHeight: 1.5,
                  }}
                  dangerouslySetInnerHTML={{ __html: opl.description_html }}
                />
              )}

              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                {collectionName && collectionName !== 'Общие' && (
                  <Chip
                    label={collectionName}
                    size="small"
                    icon={<FolderIcon sx={{ fontSize: 11 }} />}
                    sx={{
                      bgcolor: '#f5f5f5', color: 'text.secondary',
                      fontWeight: 500, fontSize: '0.65rem', height: 20,
                      borderRadius: 1,
                    }}
                  />
                )}
                {opl.author && (
                  <Tooltip title={authorName} arrow>
                    <Avatar
                      sx={{ width: 20, height: 20, fontSize: '0.6rem', bgcolor: 'grey.300', color: 'grey.700', cursor: 'default' }}
                    >
                      {getAuthorInitials()}
                    </Avatar>
                  </Tooltip>
                )}
                {visibleTags.map(tag => (
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
                {showMore && (
                  <Chip
                    label={`+${hiddenCount}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: '0.65rem', height: 22, borderRadius: 1,
                      cursor: 'pointer', minWidth: 'auto', px: 0.5,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTagsAnchor(e.currentTarget);
                    }}
                  />
                )}
                <Tooltip
                  title={`${opl.step_count} ${stepWord(opl.step_count)}`}
                  arrow
                >
                  <Chip
                    icon={!isMobile ? null : <StepIcon sx={{ fontSize: 12 }} />}
                    label={isMobile ? `${opl.step_count}` : `${opl.step_count} ${stepWord(opl.step_count)}`}
                    size="small"
                    sx={{
                      bgcolor: '#e3f2fd', color: '#1565c0',
                      fontWeight: 500, fontSize: '0.7rem', height: 22,
                      borderRadius: 1,
                    }}
                  />
                </Tooltip>
                {opl.total_duration_sec > 0 && (
                  <Chip
                    icon={<TimerIcon sx={{ fontSize: 12 }} />}
                    label={isMobile ? formatDuration(opl.total_duration_sec) : formatDuration(opl.total_duration_sec)}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 22, borderRadius: 1 }}
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

      {showMore && (
        <Menu
          anchorEl={tagsAnchor}
          open={Boolean(tagsAnchor)}
          onClose={() => setTagsAnchor(null)}
          onClick={(e) => e.stopPropagation()}
        >
          {tags.map(tag => (
            <MenuItem
              key={tag.id}
              onClick={() => setTagsAnchor(null)}
              sx={{
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 10, height: 10, borderRadius: '50%',
                  bgcolor: tag.color, flexShrink: 0,
                }}
              />
              {tag.name}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}
