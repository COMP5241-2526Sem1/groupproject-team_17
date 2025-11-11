



'use client';

import { useClassroomContext } from 'auth-classroom';
import { useState } from 'react';

import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Drawer,
  Fab,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';

import { activityAPI } from 'src/api/api-function-call';

import { Iconify } from 'src/components/iconify';

import { ActivitiesList, CurrentActivityDisplay } from './components';
import { useClassroomActivities } from './hooks';

// ----------------------------------------------------------------------

export default function ClassRoomView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { classroomState, isAuthencated } = useClassroomContext();
  const { currentActivity, activities, onlineCount, error, fetchActivities } = useClassroomActivities();

  // State for viewing history
  const [viewingActivity, setViewingActivity] = useState(null);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // State for mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Handle submission success - refresh activities to update submission status
  const handleSubmitSuccess = (submissionData) => {
    console.log('[ClassRoomView] Submission successful:', submissionData);
    // Only refresh activities list, don't trigger component remount
    // Use a flag or optimize fetchActivities to avoid resetting currentActivity
    if (fetchActivities) {
      // Delay refresh slightly to avoid immediate re-render
      setTimeout(() => {
        fetchActivities();
      }, 100);
    }
  };

  // Handle activity selection from list
  const handleActivitySelect = async (activity) => {
    console.log('[ClassRoomView] Selected activity:', activity);

    if (activity.status === 'active') {
      // If selecting active activity, return to live mode
      setIsViewingHistory(false);
      setViewingActivity(null);
    } else {
      // If selecting historical activity, fetch full details first
      setIsLoadingActivity(true);
      const startTime = Date.now();

      try {
        const response = await activityAPI.getActivity(activity.id);
        if (response.code === 0 && response.data) {
          const fullActivity = response.data;

          // Normalize type - handle both numeric (1,2,3) and string ("quiz", "poll", "discussion", "Quiz", "Polling", "Discussion")
          let normalizedType;
          if (typeof fullActivity.type === 'number') {
            normalizedType = fullActivity.type === 1 ? 'quiz' : fullActivity.type === 2 ? 'poll' : 'discussion';
          } else {
            const lowerType = fullActivity.type?.toLowerCase();
            normalizedType = lowerType === 'polling' ? 'poll' : lowerType;
          }

          const transformedActivity = {
            id: fullActivity.id,
            type: normalizedType,
            title: fullActivity.title,
            description: fullActivity.description,
            isActive: fullActivity.isActive,
            hasBeenActivated: fullActivity.hasBeenActivated,
            expiresAt: fullActivity.expiresAt,
            createdAt: fullActivity.createdAt,
            startedAt: fullActivity.quiz_StartedAt || fullActivity.startedAt, // Add startedAt for quiz timer
            // Type-specific data
            ...(normalizedType === 'quiz' && {
              // Quiz
              questions: fullActivity.questions || [],
              timeLimit: fullActivity.quiz_TimeLimit,
              showCorrectAnswers: fullActivity.quiz_ShowCorrectAnswers,
              shuffleQuestions: fullActivity.quiz_ShuffleQuestions,
            }),
            ...(normalizedType === 'poll' && {
              // Poll
              options: fullActivity.options || [],
              allowMultipleSelections: fullActivity.poll_AllowMultipleSelections,
              isAnonymous: fullActivity.poll_IsAnonymous,
            }),
            ...(normalizedType === 'discussion' && {
              // Discussion
              maxLength: fullActivity.discussion_MaxLength,
              allowAnonymous: fullActivity.discussion_AllowAnonymous,
              requireApproval: fullActivity.discussion_RequireApproval,
            }),
          };

          // Ensure loading animation shows for at least 800ms to cover both loading states
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, 800 - elapsedTime);

          await new Promise(resolve => setTimeout(resolve, remainingTime));

          setIsViewingHistory(true);
          setViewingActivity(transformedActivity);
        }
      } catch (err) {
        console.error('[ClassRoomView] Failed to fetch activity details:', err);
        // Ensure minimum loading time even on error
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 800 - elapsedTime);
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      } finally {
        setIsLoadingActivity(false);
      }
    }

    // Close drawer on mobile
    if (isMobile) {
      setDrawerOpen(false);
    }
  };  // Determine which activity to display
  const displayActivity = isViewingHistory ? viewingActivity : currentActivity;

  if (!isAuthencated) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Alert severity="warning">Please join a classroom first.</Alert>
      </Container>
    );
  }

  // Activities sidebar content
  const activitiesSidebar = (
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6">All Activities</Typography>
        {isMobile && (
          <IconButton onClick={() => setDrawerOpen(false)} size="small">
            <Iconify icon="solar:close-circle-bold" />
          </IconButton>
        )}
      </Stack>

      <ActivitiesList
        activities={activities}
        onActivitySelect={handleActivitySelect}
        selectedActivityId={displayActivity?.id}
      />
    </Stack>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4">{classroomState.courseName || 'Classroom'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {classroomState.courseCode}
            </Typography>
          </Box>
        </Stack>

        {/* Error Alert */}
        {error && <Alert severity="error">{error}</Alert>}

        {/* Main Content - Responsive Layout */}
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Current Activity - Main Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack spacing={2}>
              <Typography variant="h6">
                {isViewingHistory ? 'Historical Activity' : 'Current Activity'}
              </Typography>
              {isLoadingActivity ? (
                <Card>
                  <CardContent>
                    <Stack spacing={2} alignItems="center" sx={{ py: 5 }}>
                      <CircularProgress size={48} />
                      <Typography variant="body2" color="text.secondary">
                        Loading activity...
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ) : (
                <CurrentActivityDisplay
                  activity={displayActivity}
                  onSubmitSuccess={handleSubmitSuccess}
                  isHistoryView={isViewingHistory}
                />
              )}
            </Stack>
          </Box>

          {/* Activities List - Desktop Sidebar */}
          {!isMobile && (
            <Box
              sx={{
                width: 320,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 200px)', // Limit height based on viewport
              }}
            >
              {activitiesSidebar}
            </Box>
          )}
        </Box>

        {/* Mobile: Floating Action Button to open drawer */}
        {isMobile && (
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: 1000,
            }}
            onClick={() => setDrawerOpen(true)}
          >
            <Iconify icon="solar:list-bold" width={24} />
          </Fab>
        )}

        {/* Mobile: Drawer for activities list */}
        {isMobile && (
          <Drawer
            anchor="right"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{
              sx: {
                width: '80%',
                maxWidth: 360,
                p: 3,
                display: 'flex',
                flexDirection: 'column',
              },
            }}
          >
            {activitiesSidebar}
          </Drawer>
        )}
      </Stack>
    </Container>
  );
}
