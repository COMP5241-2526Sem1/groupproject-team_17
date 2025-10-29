'use client';

import { useState } from 'react';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function LearningActivitiesCard({
  activities,
  loading,
  error,
  onToggleActivity,
  onCreateNew,
  onEditActivity,
  onDeleteActivity,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const handleMenuOpen = (event, activity) => {
    setAnchorEl(event.currentTarget);
    setSelectedActivity(activity);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedActivity(null);
  };

  const handleEdit = () => {
    if (selectedActivity && onEditActivity) {
      onEditActivity(selectedActivity);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedActivity && onDeleteActivity) {
      onDeleteActivity(selectedActivity.id);
    }
    handleMenuClose();
  };

  return (
    <Card>
      <CardHeader
        title="Learning Activities"
        action={
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            onClick={onCreateNew}
          >
            Create New
          </Button>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : activities.length === 0 ? (
          <Alert severity="info">No activities yet. Create your first activity!</Alert>
        ) : (
          <List>
            {activities.map((activity, index) => (
              <ListItem
                key={activity.id}
                divider={index < activities.length - 1}
                secondaryAction={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={activity.status}
                      size="small"
                      color={
                        activity.status === 'active'
                          ? 'success'
                          : activity.status === 'completed'
                            ? 'info'
                            : 'warning'
                      }
                    />
                    <Button
                      size="small"
                      variant={activity.isActive ? 'contained' : 'outlined'}
                      color={activity.isActive ? 'error' : 'success'}
                      onClick={() => onToggleActivity(activity.id, activity.isActive)}
                      startIcon={
                        <Iconify
                          icon={
                            activity.isActive
                              ? 'solar:pause-circle-bold'
                              : 'solar:play-circle-bold'
                          }
                        />
                      }
                    >
                      {activity.isActive ? 'Stop' : 'Start'}
                    </Button>
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, activity)}>
                      <Iconify icon="solar:menu-dots-bold" />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Iconify
                      icon={
                        activity.type === 'quiz'
                          ? 'solar:question-circle-bold'
                          : activity.type === 'poll'
                            ? 'solar:chart-2-bold'
                            : 'solar:chat-round-dots-bold'
                      }
                    />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={activity.title}
                  secondary={
                    <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                      {activity.type === 'quiz' && (
                        <>
                          <Typography variant="caption">
                            {activity.questions?.length || 0} questions
                          </Typography>
                          <Typography variant="caption">
                            {activity.timeLimit}s time limit
                          </Typography>
                        </>
                      )}
                      {activity.type === 'poll' && (
                        <>
                          <Typography variant="caption">
                            {activity.options?.length || 0} options
                          </Typography>
                          {activity.allowMultipleSelections && (
                            <Typography variant="caption" color="info.main">
                              Multiple selections
                            </Typography>
                          )}
                        </>
                      )}
                      {activity.type === 'discussion' && (
                        <>
                          <Typography variant="caption">
                            Max {activity.maxLength} chars
                          </Typography>
                        </>
                      )}
                    </Stack>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleEdit}>
            <Iconify icon="solar:pen-bold" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Iconify icon="solar:trash-bin-trash-bold" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
}
