'use client';

import { useEffect, useState } from 'react';

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
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';

import { activityAPI } from 'src/api/api-function-call';
import { Iconify } from 'src/components/iconify';
import { useInstructorWebSocket } from 'src/contexts';

// ----------------------------------------------------------------------

export default function LearningActivitiesCard({
  activities,
  loading,
  error,
  totalStudents = 0,
  onToggleActivity,
  onCreateNew,
  onEditActivity,
  onDeleteActivity,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [submissionCounts, setSubmissionCounts] = useState({});

  // WebSocket connection for real-time updates
  const { subscribeMessage } = useInstructorWebSocket();

  // Fetch submission counts for all activities
  useEffect(() => {
    const fetchSubmissionCounts = async () => {
      if (!activities || activities.length === 0) return;

      const counts = {};
      await Promise.all(
        activities.map(async (activity) => {
          try {
            const response = await activityAPI.getActivitySubmissions(activity.id);
            if (response?.code === 0 && response?.data) {
              counts[activity.id] = response.data.length;
            } else {
              counts[activity.id] = 0;
            }
          } catch (err) {
            console.error(`Error fetching submissions for activity ${activity.id}:`, err);
            counts[activity.id] = 0;
          }
        })
      );
      setSubmissionCounts(counts);
    };

    fetchSubmissionCounts();
  }, [activities]);

  // Subscribe to WebSocket for real-time submission updates
  useEffect(() => {
    if (!activities || activities.length === 0) return undefined;

    const handleMessage = (message) => {
      // Listen for NEW_SUBMISSION events
      if (message?.Type === 'NEW_SUBMISSION' && message?.Payload?.activityId) {
        const activityId = message.Payload.activityId;

        console.log('[LearningActivities] NEW_SUBMISSION received for activity:', activityId);

        // Update the submission count for this specific activity
        activityAPI.getActivitySubmissions(activityId)
          .then((response) => {
            if (response?.code === 0 && response?.data) {
              setSubmissionCounts((prev) => ({
                ...prev,
                [activityId]: response.data.length,
              }));
              console.log('[LearningActivities] Updated submission count for', activityId, ':', response.data.length);
            }
          })
          .catch((err) => {
            console.error('[LearningActivities] Error updating submission count:', err);
          });
      }
    };

    const unsubscribe = subscribeMessage(handleMessage);

    return () => {
      unsubscribe();
    };
  }, [activities, subscribeMessage]);

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
                  <Avatar >
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
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>


                      {/* Activity Details */}
                      <Stack direction="row" spacing={2}>
                        {activity.type === 'quiz' && (
                          <>
                            <Typography variant="caption" color="text.secondary">
                              {activity.questions?.length || 0} question{activity.questions?.length !== 1 ? 's' : ''}
                            </Typography>
                            {(() => {
                              // Backend returns TimeLimit (PascalCase) or timeLimit (camelCase)
                              const timeLimit = activity.timeLimit ?? activity.TimeLimit ?? 0;
                              return timeLimit ? (
                                <Typography variant="caption" color="text.secondary">
                                  {timeLimit}s limit
                                </Typography>
                              ) : null;
                            })()}
                          </>
                        )}
                        {activity.type === 'poll' && (
                          <>
                            <Typography variant="caption" color="text.secondary">
                              {activity.options?.length || 0} option{activity.options?.length !== 1 ? 's' : ''}
                            </Typography>
                            {(() => {
                              // Backend returns AllowMultipleSelections (PascalCase) or allowMultipleSelections (camelCase)
                              const allowMultiple = activity.allowMultipleSelections ?? activity.AllowMultipleSelections ?? false;
                              return allowMultiple ? (
                                <Typography variant="caption" color="info.main">
                                  Multiple
                                </Typography>
                              ) : null;
                            })()}
                          </>
                        )}
                        {activity.type === 'discussion' && (() => {
                          // Backend returns MaxLength (PascalCase) or maxLength (camelCase)
                          const maxLength = activity.maxLength ?? activity.MaxLength;
                          return maxLength ? (
                            <Typography variant="caption" color="text.secondary">
                              Max {maxLength} chars
                            </Typography>
                          ) : null;
                        })()}
                      </Stack>

                      {/* Completion Rate - Compact version */}
                      {totalStudents > 0 && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            Completion:
                          </Typography>
                          <Box sx={{ flex: 1, maxWidth: 120 }}>
                            <LinearProgress
                              variant="determinate"
                              value={
                                totalStudents > 0
                                  ? ((submissionCounts[activity.id] || 0) / totalStudents) * 100
                                  : 0
                              }
                              sx={{
                                height: 6,
                                borderRadius: 1,
                                bgcolor: 'action.hover',
                              }}
                            />
                          </Box>
                          <Typography variant="caption" fontWeight="medium">
                            {submissionCounts[activity.id] || 0}/{totalStudents} (
                            {totalStudents > 0
                              ? Math.round(((submissionCounts[activity.id] || 0) / totalStudents) * 100)
                              : 0}%)
                          </Typography>
                        </Stack>
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
