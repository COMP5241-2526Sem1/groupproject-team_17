import { useEffect, useState } from 'react';

import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function ActivitiesList({ activities, onActivitySelect, selectedActivityId }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'unanswered'
  const [, forceUpdate] = useState(0); // State for forcing re-render

  // Set up interval to check for expired quizzes every second
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render every second to update quiz expiration status
      forceUpdate(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Filter out pending activities (never started by teacher)
  const activitiesWithoutPending = activities.filter(activity => activity.status !== 'pending');

  if (activitiesWithoutPending.length === 0) {
    return <Alert severity="info">No activities available yet.</Alert>;
  }

  // Sort activities: active first, then by newest to oldest
  const sortedActivities = [...activitiesWithoutPending].sort((a, b) => {
    // Active activities come first
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;

    // Then sort by creation date (assuming newer IDs are more recent)
    // If you have a createdAt field, use that instead
    return b.id.localeCompare(a.id);
  });

  // Filter activities based on selected filter
  const filteredActivities = filter === 'unanswered'
    ? sortedActivities.filter(activity => !activity.hasSubmitted)
    : sortedActivities;

  return (
    <Stack spacing={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filter Buttons */}
      <Box>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(e, newFilter) => {
            if (newFilter !== null) {
              setFilter(newFilter);
            }
          }}
          size="small"
          fullWidth
          sx={{ mb: 1 }}
        >
          <ToggleButton value="all">
            All ({activitiesWithoutPending.length})
          </ToggleButton>
          <ToggleButton value="unanswered">
            Unanswered ({activitiesWithoutPending.filter(a => !a.hasSubmitted).length})
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Activities List with scroll */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'background.paper',
            borderRadius: 1,
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: 1,
            '&:hover': {
              bgcolor: 'text.secondary',
            },
          },
        }}
      >
        {filteredActivities.length === 0 ? (
          <Alert severity="info">
            {filter === 'unanswered' ? 'No unanswered activities' : 'No activities available yet.'}
          </Alert>
        ) : (
          <Stack spacing={2}>
            {filteredActivities.map((activity) => {
              const isSelected = selectedActivityId === activity.id;
              const isActive = activity.status === 'active';

              return (
                <Card
                  key={activity.id}
                  variant={isSelected ? "elevation" : "outlined"}
                  sx={{
                    border: isSelected ? 2 : 1,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                  }}
                >
                  <CardActionArea
                    onClick={() => onActivitySelect?.(activity)}
                    sx={{
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <CardContent>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                          <Iconify
                            icon={
                              (() => {
                                // Normalize type to lowercase and handle "polling"
                                const normalizedType = activity.type?.toLowerCase();
                                const activityType = normalizedType === 'polling' ? 'poll' : normalizedType;

                                return activityType === 'quiz'
                                  ? 'solar:question-circle-bold'
                                  : activityType === 'poll'
                                    ? 'solar:chart-2-bold'
                                    : 'solar:chat-round-dots-bold';
                              })()
                            }
                            width={24}
                            color={isSelected ? 'primary.main' : 'text.secondary'}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: isSelected ? 600 : 400,
                                color: isSelected ? 'primary.main' : 'text.primary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {activity.title}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ textTransform: 'capitalize' }}
                            >
                              {(() => {
                                // Display normalized type
                                const normalizedType = activity.type?.toLowerCase();
                                return normalizedType === 'polling' ? 'poll' : normalizedType;
                              })()}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {(() => {
                            // For quiz activities, check if time is up
                            const normalizedType = activity.type?.toLowerCase();
                            const isQuiz = normalizedType === 'quiz';

                            if (isQuiz && activity.startedAt && activity.timeLimit > 0) {
                              // Quiz with timer - check if expired
                              const startedAtString = activity.startedAt.endsWith('Z') || activity.startedAt.includes('+')
                                ? activity.startedAt
                                : activity.startedAt + 'Z';
                              const startedTime = new Date(startedAtString).getTime();
                              const expirationTime = startedTime + (activity.timeLimit * 1000);
                              const isExpired = Date.now() >= expirationTime;

                              // If time expired, always show "Submitted" regardless of isActive
                              if (isExpired) {
                                return (
                                  <Chip
                                    icon={<Iconify icon="solar:check-circle-bold" width={16} />}
                                    label="Submitted"
                                    size="small"
                                    color="success"
                                    variant="filled"
                                    sx={{ flexShrink: 0 }}
                                  />
                                );
                              }

                              // Time not expired yet - show Active chip and In Progress
                              if (isActive) {
                                return (
                                  <>
                                    <Chip
                                      label="Active"
                                      size="small"
                                      color="success"
                                      sx={{ flexShrink: 0 }}
                                    />
                                    <Chip
                                      icon={<Iconify icon="solar:clock-circle-bold" width={16} />}
                                      label="In Progress"
                                      size="small"
                                      color="info"
                                      variant="outlined"
                                      sx={{ flexShrink: 0 }}
                                    />
                                  </>
                                );
                              }

                              // Not active and not expired (quiz not started yet) - show "Submitted"
                              return (
                                <Chip
                                  icon={<Iconify icon="solar:check-circle-bold" width={16} />}
                                  label="Submitted"
                                  size="small"
                                  color="success"
                                  variant="filled"
                                  sx={{ flexShrink: 0 }}
                                />
                              );
                            }

                            if (isQuiz && isActive) {
                              // Quiz without timer or not started - show "In Progress" if active
                              return (
                                <Chip
                                  icon={<Iconify icon="solar:clock-circle-bold" width={16} />}
                                  label="In Progress"
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                  sx={{ flexShrink: 0 }}
                                />
                              );
                            }

                            if (isQuiz && !isActive) {
                              // Quiz not active - show "Submitted"
                              return (
                                <Chip
                                  icon={<Iconify icon="solar:check-circle-bold" width={16} />}
                                  label="Submitted"
                                  size="small"
                                  color="success"
                                  variant="filled"
                                  sx={{ flexShrink: 0 }}
                                />
                              );
                            }

                            // For non-quiz activities, use the old logic
                            return (
                              <Chip
                                icon={activity.hasSubmitted ? <Iconify icon="solar:check-circle-bold" width={16} /> : undefined}
                                label={activity.hasSubmitted ? 'Submitted' : 'Not Submitted'}
                                size="small"
                                color={activity.hasSubmitted ? 'success' : 'default'}
                                variant={activity.hasSubmitted ? 'filled' : 'outlined'}
                                sx={{ flexShrink: 0 }}
                              />
                            );
                          })()}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
