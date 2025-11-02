'use client';

import { useEffect, useState } from 'react';

import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  LinearProgress,
  Pagination,
  Stack,
  Typography,
} from '@mui/material';

import { activityAPI } from 'src/api/api-function-call';
import { Iconify } from 'src/components/iconify';
import { useInstructorWebSocket } from 'src/contexts';

// ----------------------------------------------------------------------

export default function ActiveActivityStats({ activity, joinedStudentsCount, totalStudents = 0 }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [discussionPage, setDiscussionPage] = useState(1);
  const discussionPageSize = 5;

  // WebSocket connection
  const { subscribeMessage, unsubscribeMessage } = useInstructorWebSocket();

  // Reset state when activity changes
  useEffect(() => {
    console.log('[ActiveActivityStats] Activity prop changed:', {
      id: activity?.id,
      type: activity?.type,
      title: activity?.title,
      isActive: activity?.isActive,
    });
    setSubmissions([]);
    setLoading(false);
    setTimeRemaining(null);
    setDiscussionPage(1); // Reset pagination when activity changes
  }, [activity?.id, activity?.type, activity?.title]);

  // Load submissions
  useEffect(() => {
    if (!activity?.id) return undefined;

    const loadSubmissions = async () => {
      setLoading(true);
      try {
        console.log('[ActiveActivityStats] Loading submissions for activity:', activity.id);
        const response = await activityAPI.getActivitySubmissions(activity.id);
        console.log('[ActiveActivityStats] Submissions response:', response);
        console.log('[ActiveActivityStats] Submissions response data:', JSON.stringify(response?.data, null, 2));

        if (response?.code === 0 && response?.data) {
          console.log('[ActiveActivityStats] Setting submissions:', response.data.length, 'items');
          console.log('[ActiveActivityStats] First submission sample:', response.data[0]);
          setSubmissions(response.data);
        } else {
          console.warn('[ActiveActivityStats] Invalid response:', response);
        }
      } catch (err) {
        console.error('[ActiveActivityStats] Error loading submissions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();

    // No need for polling - WebSocket handles real-time updates
    return undefined;
  }, [activity?.id]);  // Subscribe to WebSocket for real-time updates
  useEffect(() => {
    if (!activity?.id) return undefined;

    const handleMessage = (message) => {
      // Only process NEW_SUBMISSION messages for the current activity
      if (message?.Type === 'NEW_SUBMISSION' && message?.Payload?.activityId === activity.id) {
        console.log('[ActiveActivityStats] NEW_SUBMISSION received for current activity:', message);

        // Reload submissions immediately when new submission arrives
        activityAPI.getActivitySubmissions(activity.id).then((response) => {
          if (response?.code === 0 && response?.data) {
            console.log('[ActiveActivityStats] Updated submissions:', response.data.length, 'items');
            setSubmissions(response.data);
          }
        }).catch((err) => {
          console.error('[ActiveActivityStats] Error reloading after submission:', err);
        });
      }
    };

    const unsubscribe = subscribeMessage(handleMessage);

    return () => {
      unsubscribe();
    };
  }, [activity?.id, subscribeMessage]);

  // Quiz countdown timer
  useEffect(() => {
    if (activity?.type !== 'quiz' || !activity?.createdAt || activity?.timeLimit === 0) return undefined;

    const updateTimer = () => {
      if (!activity.createdAt || activity.timeLimit === 0) return;

      let createdAtString = activity.createdAt;
      if (!createdAtString.endsWith('Z') && !createdAtString.includes('+')) {
        createdAtString = `${createdAtString}Z`;
      }

      const startTime = new Date(createdAtString).getTime();
      const expirationTime = startTime + activity.timeLimit * 1000;
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expirationTime - now) / 1000));

      setTimeRemaining(remaining);

      if (remaining === 0) {
        return;
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [activity?.type, activity?.createdAt, activity?.timeLimit]);

  if (!activity) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">No active activity</Alert>
        </CardContent>
      </Card>
    );
  }

  console.log('[ActiveActivityStats] Rendering with:', {
    activityId: activity.id,
    activityType: activity.type,
    submissionsCount: submissions.length,
    joinedStudentsCount,
    totalStudents,
    loading,
    activityOptions: activity.options,
  });

  const submissionCount = submissions.length;
  const submissionRate =
    joinedStudentsCount > 0 ? ((submissionCount / joinedStudentsCount) * 100).toFixed(0) : 0;

  // Render Quiz Stats
  const renderQuizStats = () => {
    const hasTimeLimit = activity.timeLimit > 0;

    return (
      <Stack spacing={2}>
        {hasTimeLimit && timeRemaining !== null && (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Iconify icon="solar:clock-circle-bold" width={20} color="warning.main" />
              <Typography variant="subtitle2">
                Time Remaining: {Math.floor(timeRemaining / 60)}:
                {String(timeRemaining % 60).padStart(2, '0')}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={
                hasTimeLimit
                  ? ((activity.timeLimit - timeRemaining) / activity.timeLimit) * 100
                  : 0
              }
              color={timeRemaining < 60 ? 'error' : 'primary'}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        )}

        {!hasTimeLimit && (
          <Alert severity="info" icon={<Iconify icon="solar:infinity-bold" />}>
            Unlimited Time
          </Alert>
        )}

        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Completion Progress (Total Students)
            </Typography>
            <Typography variant="h6" color="primary">
              {submissionCount} / {totalStudents > 0 ? totalStudents : joinedStudentsCount}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={parseFloat(
              totalStudents > 0
                ? ((submissionCount / totalStudents) * 100).toFixed(0)
                : submissionRate
            )}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {totalStudents > 0
              ? ((submissionCount / totalStudents) * 100).toFixed(0)
              : submissionRate}% completed
          </Typography>
        </Box>

        {submissions.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Average Score
            </Typography>
            <Typography variant="h4" color="success.main">
              {(
                submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length
              ).toFixed(1)}
              %
            </Typography>
          </Box>
        )}
      </Stack>
    );
  };

  // Render Poll Stats
  const renderPollStats = () => {
    const optionCounts = {};

    console.log('[ActiveActivityStats] Processing Poll submissions:', submissions);

    // Count votes for each option
    submissions.forEach((submission, idx) => {
      console.log(`[ActiveActivityStats] Submission ${idx}:`, submission);
      console.log(`[ActiveActivityStats] selectedOptions type:`, typeof submission.selectedOptions, submission.selectedOptions);

      let options = submission.selectedOptions || [];

      // Handle if selectedOptions is a string (JSON) that needs parsing
      if (typeof options === 'string') {
        try {
          options = JSON.parse(options);
          console.log('[ActiveActivityStats] Parsed selectedOptions:', options);
        } catch (e) {
          console.error('[ActiveActivityStats] Failed to parse selectedOptions:', e);
          options = [];
        }
      }

      // Ensure options is an array
      if (!Array.isArray(options)) {
        console.warn('[ActiveActivityStats] selectedOptions is not an array:', options);
        options = [];
      }

      options.forEach((optionIndex) => {
        console.log('[ActiveActivityStats] Counting vote for option:', optionIndex);
        optionCounts[optionIndex] = (optionCounts[optionIndex] || 0) + 1;
      });
    });

    console.log('[ActiveActivityStats] Poll Results:', {
      submissionCount,
      optionCounts,
      options: activity.options,
      optionsType: typeof activity.options,
      optionsIsArray: Array.isArray(activity.options),
      optionsLength: activity.options?.length,
      allowMultipleSelections: activity.allowMultipleSelections,
      fullActivity: activity,
    });

    // Use totalStudents (all enrolled students) as base for Poll participation
    const baseStudentCount = totalStudents > 0 ? totalStudents : joinedStudentsCount;
    const pollParticipationRate = baseStudentCount > 0
      ? ((submissionCount / baseStudentCount) * 100).toFixed(0)
      : 0;

    return (
      <Stack spacing={2}>
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Participation (Total Students)
            </Typography>
            <Typography variant="h6" color="primary">
              {submissionCount} / {baseStudentCount}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={parseFloat(pollParticipationRate)}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {pollParticipationRate}% voted
          </Typography>
        </Box>

        {/* Always show results section for Poll */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Results {submissionCount > 0 && `(${submissionCount} ${submissionCount === 1 ? 'vote' : 'votes'})`}
          </Typography>
          {Array.isArray(activity.options) && activity.options.length > 0 ? (
            <Stack spacing={1}>
              {activity.options.map((option, index) => {
                const count = optionCounts[index] || 0;
                // Percentage based on number of students who voted
                const percentage = submissionCount > 0 ? ((count / submissionCount) * 100).toFixed(1) : 0;

                // Handle both {Text, ImageUrl} (from backend) and {text, imageUrl} (frontend format)
                const optionText = typeof option === 'string'
                  ? option
                  : (option.Text || option.text || 'Option ' + (index + 1));

                return (
                  <Box key={index}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" noWrap sx={{ flex: 1, mr: 2 }}>
                        {optionText}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {count} ({percentage}%)
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={parseFloat(percentage)}
                      sx={{ height: 6, borderRadius: 1 }}
                    />
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Alert severity="warning" sx={{ py: 1 }}>
              No poll options available
              {activity.options && (
                <Typography variant="caption" display="block">
                  Debug: options = {JSON.stringify(activity.options)}
                </Typography>
              )}
            </Alert>
          )}
        </Box>
      </Stack>
    );
  };

  // Render Discussion Stats
  const renderDiscussionStats = () => {
    // Use totalStudents (all enrolled students) as base for Discussion participation
    const baseStudentCount = totalStudents > 0 ? totalStudents : joinedStudentsCount;
    const discussionParticipationRate = baseStudentCount > 0
      ? ((submissionCount / baseStudentCount) * 100).toFixed(0)
      : 0;

    return (
      <Stack spacing={2}>
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Responses (Total Students)
            </Typography>
            <Typography variant="h6" color="primary">
              {submissionCount} / {baseStudentCount}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={parseFloat(discussionParticipationRate)}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {discussionParticipationRate}% participated
          </Typography>
        </Box>

        {submissions.length > 0 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">
                Recent Responses ({submissions.length} total)
              </Typography>
            </Stack>
            <Stack spacing={1} sx={{ maxHeight: 400, overflow: 'auto' }}>
              {submissions
                .slice()
                .reverse()
                .slice((discussionPage - 1) * discussionPageSize, discussionPage * discussionPageSize)
                .map((submission) => (
                  <Card key={submission.id} variant="outlined" sx={{ bgcolor: 'background.neutral' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" fontWeight="bold">
                          {submission.isAnonymous ? 'Anonymous' : submission.studentId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(submission.submittedAt).toLocaleTimeString()}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {submission.text}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
            </Stack>
            {submissions.length > discussionPageSize && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={Math.ceil(submissions.length / discussionPageSize)}
                  page={discussionPage}
                  onChange={(event, value) => setDiscussionPage(value)}
                  color="primary"
                  size="small"
                />
              </Box>
            )}
          </Box>
        )}
      </Stack>
    );
  };

  const getActivityIcon = () => {
    switch (activity.type) {
      case 'quiz':
        return 'solar:question-circle-bold';
      case 'poll':
        return 'solar:chart-2-bold';
      case 'discussion':
        return 'solar:chat-round-dots-bold';
      default:
        return 'solar:document-bold';
    }
  };

  return (
    <Card>
      <CardHeader
        title="Active Activity Statistics"
        subheader={activity.title}
        avatar={<Iconify icon={getActivityIcon()} width={24} />}
        action={
          <Chip
            label={typeof activity.type === 'string' ? activity.type.toUpperCase() : 'ACTIVITY'}
            color="success"
            size="small"
            icon={<Iconify icon="solar:play-circle-bold" />}
          />
        }
      />
      <CardContent>
        {loading && submissions.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {activity.type === 'quiz' && renderQuizStats()}
            {activity.type === 'poll' && renderPollStats()}
            {activity.type === 'discussion' && renderDiscussionStats()}
          </>
        )}
      </CardContent>
    </Card>
  );
}
