import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

import DiscussionActivity from './discussion-activity';
import { PollActivity } from './poll-activity';
import { QuizActivity } from './quiz-activity';

// ----------------------------------------------------------------------

export function CurrentActivityDisplay({ activity, onSubmitSuccess, isHistoryView = false }) {
  console.log('[CurrentActivityDisplay] Rendering activity:', activity);

  if (!activity) {
    return (
      <Alert severity="info" icon={<Iconify icon="solar:hourglass-bold" />}>
        {isHistoryView ? 'Please select an activity from the list' : 'No activity available'}
      </Alert>
    );
  }

  // Normalize activity type to lowercase and handle both "poll" and "polling"
  const normalizedType = activity.type?.toLowerCase();
  const activityType = normalizedType === 'polling' ? 'poll' : normalizedType;

  console.log('[CurrentActivityDisplay] Normalized type:', {
    original: activity.type,
    normalized: normalizedType,
    final: activityType
  });

  // Render specific activity type component
  if (activityType === 'poll') {
    return (
      <PollActivity
        activity={activity}
        onSubmitSuccess={onSubmitSuccess}
        isHistoryView={isHistoryView}
      />
    );
  }

  if (activityType === 'quiz') {
    return (
      <QuizActivity
        activity={activity}
        onSubmitSuccess={onSubmitSuccess}
        isHistoryView={isHistoryView}
      />
    );
  }

  if (activityType === 'discussion') {
    return (
      <DiscussionActivity
        activity={activity}
        onSubmitSuccess={onSubmitSuccess}
        isHistoryView={isHistoryView}
      />
    );
  }

  // Default display for other activity types
  const isActive = activity.isActive && !isHistoryView;
  const statusLabel = isHistoryView
    ? (activity.hasBeenActivated ? 'COMPLETED' : 'PENDING')
    : (activity.isActive ? 'ACTIVE' : 'INACTIVE');
  const statusColor = isActive ? 'success' : activity.hasBeenActivated ? 'info' : 'warning';

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5">{activity.title}</Typography>
            <Chip
              label={statusLabel}
              color={statusColor}
              icon={
                <Iconify
                  icon={
                    isActive
                      ? "solar:play-circle-bold"
                      : activity.hasBeenActivated
                        ? "solar:check-circle-bold"
                        : "solar:clock-circle-bold"
                  }
                />
              }
            />
          </Stack>

          {activity.description && (
            <Typography variant="body2" color="text.secondary">
              {activity.description}
            </Typography>
          )}

          {/* Type-specific content for quiz and discussion */}
          {activityType === 'quiz' && (
            <Box>
              <Typography variant="subtitle2">
                {activity.questions?.length || 0} questions
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Time limit: {activity.timeLimit}s
              </Typography>
            </Box>
          )}

          {activityType === 'discussion' && (
            <Box>
              <Typography variant="subtitle2">Discussion Activity</Typography>
              {activity.maxLength && (
                <Typography variant="caption" color="text.secondary">
                  Max length: {activity.maxLength} characters
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
