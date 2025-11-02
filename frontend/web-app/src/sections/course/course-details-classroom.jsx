'use client';

import { useEffect, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Typography,
} from '@mui/material';

import { activityAPI, realtimeClassAPI } from 'src/api/api-function-call';
import { useInstructorWebSocket } from 'src/contexts';
import { useSelector } from 'src/redux/hooks';

import CreateDiscussionDialog from './classroom-create-activity/create-discussion-dialog';
import CreatePollDialog from './classroom-create-activity/create-poll-dialog';
import CreateQuizDialog from './classroom-create-activity/create-quiz-dialog';
import EditDiscussionDialog from './classroom-create-activity/edit-discussion-dialog';
import EditPollDialog from './classroom-create-activity/edit-poll-dialog';
import EditQuizDialog from './classroom-create-activity/edit-quiz-dialog';
import {
  ActiveActivityStats,
  InteractiveActivitiesCard,
  LearningActivitiesCard,
  SessionStatusCard,
} from './classroom-session';

// ----------------------------------------------------------------------

export default function CourseDetailsClassroom() {
  const { selectedCourse } = useSelector((state) => state.classManagement);

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time classroom status
  const [joinedStudentsCount, setJoinedStudentsCount] = useState(0);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [isClassroomActive, setIsClassroomActive] = useState(false);

  // Dialog states
  const [createPollOpen, setCreatePollOpen] = useState(false);
  const [createQuizOpen, setCreateQuizOpen] = useState(false);
  const [createDiscussionOpen, setCreateDiscussionOpen] = useState(false);
  const [editPollOpen, setEditPollOpen] = useState(false);
  const [editQuizOpen, setEditQuizOpen] = useState(false);
  const [editDiscussionOpen, setEditDiscussionOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState(null);

  // WebSocket connection from context
  const { isConnected, subscribeMessage, unsubscribeMessage } = useInstructorWebSocket();

  // Debug: Monitor currentActivity changes
  useEffect(() => {
    console.log('[Classroom] currentActivity changed:', currentActivity);
  }, [currentActivity]);

  // Handle WebSocket messages
  useEffect(() => {
    const handleMessage = (message) => {
      if (!message || !message.Type) return;

      console.log('[Classroom] WebSocket message:', message);

      switch (message.Type) {
        case 'CONNECTED':
          console.log('[Classroom] Instructor connected:', message.Payload);
          // Update joined students count from CONNECTED message
          if (message.Payload?.activeStudents !== undefined) {
            setJoinedStudentsCount(message.Payload.activeStudents);
          }
          break;

        case 'ACTIVITY_CREATED':
          console.log('[Classroom] New activity created:', message.Payload);
          // Fetch the updated list to show the new activity
          fetchActivities();
          fetchClassroomStatus(); // Refresh status to get current activity if any
          break;

        case 'ACTIVITY_UPDATED':
          console.log('[Classroom] Activity updated:', message.Payload);

          // Update activities list
          setActivities((prev) =>
            prev.map((activity) => {
              if (activity.id === message.Payload.activityId) {
                const isActive = message.Payload.isActive;
                const hasBeenActivated = message.Payload.hasBeenActivated !== undefined
                  ? message.Payload.hasBeenActivated
                  : activity.hasBeenActivated;

                // Calculate status based on isActive and hasBeenActivated
                let status;
                if (isActive) {
                  status = 'active';
                } else if (hasBeenActivated) {
                  status = 'completed';
                } else {
                  status = 'pending';
                }

                // Transform activity type from backend enum value to frontend string
                const activityType = message.Payload.activityType === 'Polling' ? 'poll'
                  : message.Payload.activityType === 'Quiz' ? 'quiz'
                    : 'discussion';

                const updatedActivity = {
                  ...activity,
                  isActive,
                  hasBeenActivated,
                  status,
                  title: message.Payload.title || activity.title,
                  description: message.Payload.description || activity.description,
                  type: activityType,
                  // Include type-specific data from WebSocket message
                  ...(activityType === 'poll' && {
                    options: message.Payload.options || [],
                    allowMultipleSelections: message.Payload.poll_AllowMultipleSelections,
                    isAnonymous: message.Payload.poll_IsAnonymous,
                  }),
                  ...(activityType === 'quiz' && {
                    timeLimit: message.Payload.timeLimit,
                    questions: message.Payload.questions || [],
                    showCorrectAnswers: message.Payload.quiz_ShowCorrectAnswers,
                  }),
                  ...(activityType === 'discussion' && {
                    maxLength: message.Payload.discussion_MaxLength,
                    allowAnonymous: message.Payload.discussion_AllowAnonymous,
                  }),
                };

                console.log('[Classroom] Updated activity in list:', updatedActivity);

                // If this activity is now active, update currentActivity immediately
                if (isActive) {
                  console.log('[Classroom] Setting currentActivity from ACTIVITY_UPDATED with options:', updatedActivity.options);
                  setCurrentActivity(updatedActivity);
                }

                return updatedActivity;
              }
              return activity;
            })
          );

          // Also fetch from server to ensure we have complete data
          console.log('[Classroom] Fetching classroom status after ACTIVITY_UPDATED...');
          setTimeout(() => {
            fetchClassroomStatus().then(() => {
              console.log('[Classroom] Classroom status refreshed');
            });
          }, 100); // Small delay to ensure state updates
          break;

        case 'ACTIVITY_DELETED':
          console.log('[Classroom] Activity deleted:', message.Payload);
          setActivities((prev) =>
            prev.filter((activity) => activity.id !== message.Payload.activityId)
          );
          fetchClassroomStatus();
          break;

        case 'ACTIVITY_DEACTIVATED':
          console.log('[Classroom] Activity deactivated:', message.Payload);
          setActivities((prev) =>
            prev.map((activity) =>
              activity.id === message.Payload.activityId
                ? { ...activity, isActive: false, status: 'completed' }
                : activity
            )
          );
          fetchClassroomStatus();
          break;

        case 'NEW_SUBMISSION':
          console.log('[Classroom] New submission received:', message.Payload);
          break;

        case 'STUDENT_JOINED':
          console.log('[Classroom] Student joined:', message.Payload);
          // Update count from payload which includes the accurate online count
          if (message.Payload?.onlineStudentsCount !== undefined) {
            setJoinedStudentsCount(message.Payload.onlineStudentsCount);
          }
          break;

        case 'STUDENT_LEFT':
          console.log('[Classroom] Student left:', message.Payload);
          // Update count from payload which includes the accurate online count
          if (message.Payload?.onlineStudentsCount !== undefined) {
            setJoinedStudentsCount(message.Payload.onlineStudentsCount);
          }
          break;

        default:
          console.log('[Classroom] Unknown message type:', message.Type);
      }
    };

    // Subscribe to WebSocket messages
    const unsubscribe = subscribeMessage(handleMessage);

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [subscribeMessage, unsubscribeMessage]);

  // Fetch classroom status (current activity and joined students)
  const fetchClassroomStatus = async () => {
    if (!selectedCourse?.id) return;

    try {
      console.log('[Classroom] Fetching classroom status for course:', selectedCourse.id);
      const response = await realtimeClassAPI.getClassroomStatus(selectedCourse.id);
      console.log('[Classroom] Classroom status response:', response);

      if (response.code === 0 && response.data) {
        setJoinedStudentsCount(response.data.joinedStudentsCount || 0);
        setIsClassroomActive(response.data.isClassroomActive || false);

        console.log('[Classroom] Raw currentActivity:', response.data.currentActivity);

        // Transform currentActivity data to match component structure
        if (response.data.currentActivity) {
          const activity = response.data.currentActivity;
          const transformedActivity = {
            id: activity.id,
            type: activity.type === 1 ? 'quiz' : activity.type === 2 ? 'poll' : 'discussion',
            title: activity.title,
            description: activity.description,
            isActive: activity.isActive,
            hasBeenActivated: activity.hasBeenActivated || false,
            createdAt: activity.createdAt,
            expiresAt: activity.expiresAt,
            // Backend returns lowercase field names from SerializeActivityWithOptions
            ...(activity.type === 1 && {
              // Quiz
              questions: activity.questions || activity.Questions || [],
              timeLimit: activity.quiz_TimeLimit ?? activity.Quiz_TimeLimit ?? activity.timeLimit ?? 0,
              showCorrectAnswers: activity.quiz_ShowCorrectAnswers ?? activity.Quiz_ShowCorrectAnswers ?? activity.showCorrectAnswers ?? false,
            }),
            ...(activity.type === 2 && {
              // Poll
              options: activity.options || activity.Options || [],
              allowMultipleSelections: activity.poll_AllowMultipleSelections ?? activity.Poll_AllowMultipleSelections ?? activity.allowMultipleSelections ?? false,
              isAnonymous: activity.poll_IsAnonymous ?? activity.Poll_IsAnonymous ?? activity.isAnonymous ?? true,
            }),
            ...(activity.type === 3 && {
              // Discussion
              maxLength: activity.discussion_MaxLength ?? activity.Discussion_MaxLength ?? activity.maxLength ?? 500,
              allowAnonymous: activity.discussion_AllowAnonymous ?? activity.Discussion_AllowAnonymous ?? activity.allowAnonymous ?? false,
            }),
          };

          console.log('[Classroom] Transformed and setting currentActivity:', transformedActivity);
          setCurrentActivity(transformedActivity);
        } else {
          console.log('[Classroom] No current activity, setting to null');
          setCurrentActivity(null);
        }
      }
    } catch (err) {
      console.error('[Classroom] Failed to fetch classroom status:', err);
    }
  };

  // Fetch activities from API
  const fetchActivities = async () => {
    if (!selectedCourse?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get all activities for the course
      const response = await activityAPI.getCourseActivities(selectedCourse.id, false);

      // Check if API call was successful
      if (response.code !== 0 || !response.data) {
        throw new Error(response.message || 'Failed to fetch activities');
      }

      console.log('[Classroom] Raw activities from API:', response.data);
      console.log('[Classroom] First activity sample:', response.data[0]);

      // Debug: Log all field names of first activity
      if (response.data.length > 0) {
        const firstActivity = response.data[0];
        console.log('[Classroom] First activity ALL fields:', Object.keys(firstActivity));
        console.log('[Classroom] First activity type:', firstActivity.type);
        if (firstActivity.type === 1) {
          console.log('[Classroom] Quiz fields check:', {
            questions: firstActivity.questions,
            Questions: firstActivity.Questions,
            quiz_TimeLimit: firstActivity.quiz_TimeLimit,
            Quiz_TimeLimit: firstActivity.Quiz_TimeLimit,
            timeLimit: firstActivity.timeLimit,
            quiz_QuestionsJson: firstActivity.quiz_QuestionsJson,
            Quiz_QuestionsJson: firstActivity.Quiz_QuestionsJson,
          });
        }
        if (firstActivity.type === 2) {
          console.log('[Classroom] Poll fields check:', {
            options: firstActivity.options,
            Options: firstActivity.Options,
            poll_AllowMultipleSelections: firstActivity.poll_AllowMultipleSelections,
            Poll_AllowMultipleSelections: firstActivity.Poll_AllowMultipleSelections,
            poll_OptionsJson: firstActivity.poll_OptionsJson,
            Poll_OptionsJson: firstActivity.Poll_OptionsJson,
          });
        }
      }

      // Transform API data to match component structure
      const transformedActivities = response.data.map((activity) => {
        console.log('[Classroom] Transforming activity:', {
          id: activity.id,
          type: activity.type,
          title: activity.title,
          rawActivity: activity,
        });

        // Calculate status based on isActive and hasBeenActivated
        let status;
        if (activity.isActive) {
          status = 'active';
        } else if (activity.hasBeenActivated) {
          status = 'completed';
        } else {
          status = 'pending';
        }

        const transformed = {
          id: activity.id,
          type: activity.type === 1 ? 'quiz' : activity.type === 2 ? 'poll' : 'discussion',
          title: activity.title,
          description: activity.description,
          status,
          isActive: activity.isActive,
          hasBeenActivated: activity.hasBeenActivated || false,
          createdAt: activity.createdAt,
          expiresAt: activity.expiresAt,
          // Backend now returns PascalCase field names from transformed objects
          ...(activity.type === 1 && {
            // Quiz - backend returns Questions (PascalCase)
            questions: activity.questions || activity.Questions || [],
            // Backend returns TimeLimit (PascalCase)
            timeLimit: activity.timeLimit ?? activity.TimeLimit ?? 0,
            showCorrectAnswers: activity.showCorrectAnswers ?? activity.ShowCorrectAnswers ?? false,
          }),
          ...(activity.type === 2 && {
            // Poll - backend returns Options (PascalCase)
            options: activity.options || activity.Options || [],
            // Backend returns AllowMultipleSelections (PascalCase)
            allowMultipleSelections: activity.allowMultipleSelections ?? activity.AllowMultipleSelections ?? false,
            isAnonymous: activity.isAnonymous ?? activity.IsAnonymous ?? true,
          }),
          ...(activity.type === 3 && {
            // Discussion - backend returns MaxLength (PascalCase)
            maxLength: activity.maxLength ?? activity.MaxLength ?? 500,
            allowAnonymous: activity.allowAnonymous ?? activity.AllowAnonymous ?? false,
          }),
        };

        console.log('[Classroom] Transformed activity:', transformed);
        return transformed;
      });

      setActivities(transformedActivities);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  // Fetch activities from API
  useEffect(() => {
    fetchActivities();
    fetchClassroomStatus(); // Also fetch classroom status
  }, [selectedCourse?.id]);

  // Handle creating a new poll
  const handleCreatePoll = async (pollData) => {
    if (!selectedCourse?.id) return;

    try {
      // Prepare the activity data for API
      const activityData = {
        type: 'Polling', // ActivityType.Polling = 2
        activityData: {
          title: pollData.title,
          description: pollData.description,
          expiresAt: pollData.expiresAt,
          options: pollData.options,
          allowMultipleSelections: pollData.allowMultipleSelections,
          isAnonymous: pollData.isAnonymous,
        },
      };

      // Call API to create activity
      const response = await activityAPI.createActivity(selectedCourse.id, activityData);

      if (response.code === 0) {
        console.log('[Classroom] Poll created successfully:', response.data);
        // Refresh activities list
        await fetchActivities();
        await fetchClassroomStatus();
      } else {
        throw new Error(response.message || 'Failed to create poll');
      }
    } catch (err) {
      console.error('[Classroom] Error creating poll:', err);
      throw err;
    }
  };

  // Handle creating a new quiz
  const handleCreateQuiz = async (quizData) => {
    if (!selectedCourse?.id) return;

    try {
      // Prepare the activity data for API
      const activityData = {
        type: 'Quiz', // ActivityType.Quiz = 1
        activityData: {
          title: quizData.title,
          description: quizData.description,
          expiresAt: quizData.expiresAt,
          questions: quizData.questions,
          timeLimit: quizData.timeLimit,
          showCorrectAnswers: quizData.showCorrectAnswers,
          shuffleQuestions: quizData.shuffleQuestions,
        },
      };

      // Call API to create activity
      const response = await activityAPI.createActivity(selectedCourse.id, activityData);

      if (response.code === 0) {
        console.log('[Classroom] Quiz created successfully:', response.data);
        // Refresh activities list
        await fetchActivities();
        await fetchClassroomStatus();
      } else {
        throw new Error(response.message || 'Failed to create quiz');
      }
    } catch (err) {
      console.error('[Classroom] Error creating quiz:', err);
      throw err;
    }
  };

  // Handle creating a new discussion
  const handleCreateDiscussion = async (discussionData) => {
    if (!selectedCourse?.id) return;

    try {
      // Prepare the activity data for API
      const activityData = {
        type: 'Discussion', // ActivityType.Discussion = 3
        activityData: {
          title: discussionData.title,
          description: discussionData.description,
          maxLength: discussionData.maxLength,
          allowAnonymous: discussionData.allowAnonymous,
          requireApproval: discussionData.requireApproval,
        },
      };

      // Call API to create activity
      const response = await activityAPI.createActivity(selectedCourse.id, activityData);

      if (response.code === 0) {
        console.log('[Classroom] Discussion created successfully:', response.data);
        // Refresh activities list
        await fetchActivities();
        await fetchClassroomStatus();
      } else {
        throw new Error(response.message || 'Failed to create discussion');
      }
    } catch (err) {
      console.error('[Classroom] Error creating discussion:', err);
      throw err;
    }
  };

  // Handle toggling activity active status
  const handleToggleActivity = async (activityId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const response = await activityAPI.updateActivity(activityId, {
        isActive: newStatus,
      });

      if (response.code === 0) {
        console.log(`[Classroom] Activity ${activityId} ${newStatus ? 'activated' : 'deactivated'}`);
        // Update will be handled by WebSocket message
      } else {
        throw new Error(response.message || 'Failed to update activity');
      }
    } catch (err) {
      console.error('[Classroom] Error toggling activity:', err);
      setError(err.message || 'Failed to update activity');
    }
  };

  // Handle editing activity - automatically detect type and open appropriate dialog
  const handleEditActivity = (activity) => {
    console.log('[Classroom] Edit activity:', activity);
    setEditingActivity(activity);

    // Auto-detect activity type and open corresponding dialog
    switch (activity.type) {
      case 'poll':
        setEditPollOpen(true);
        break;
      case 'quiz':
        setEditQuizOpen(true);
        break;
      case 'discussion':
        setEditDiscussionOpen(true);
        break;
      default:
        console.error('Unknown activity type:', activity.type);
    }
  };

  // Handle updating poll
  const handleUpdatePoll = async (pollData) => {
    if (!editingActivity?.id) return;

    try {
      const response = await activityAPI.updateActivity(editingActivity.id, {
        title: pollData.title,
        description: pollData.description,
        expiresAt: pollData.expiresAt,
        options: pollData.options,
        allowMultipleSelections: pollData.allowMultipleSelections,
        isAnonymous: pollData.isAnonymous,
      });

      if (response.code === 0) {
        console.log('[Classroom] Poll updated successfully:', response.data);
        // Refresh activities list
        await fetchActivities();
        await fetchClassroomStatus();
        setEditPollOpen(false);
        setEditingActivity(null);
      } else {
        throw new Error(response.message || 'Failed to update poll');
      }
    } catch (err) {
      console.error('[Classroom] Error updating poll:', err);
      throw err;
    }
  };

  // Handle updating quiz
  const handleUpdateQuiz = async (quizData) => {
    if (!editingActivity?.id) return;

    try {
      const response = await activityAPI.updateActivity(editingActivity.id, {
        title: quizData.title,
        description: quizData.description,
        expiresAt: quizData.expiresAt,
        questions: quizData.questions,
        timeLimit: quizData.timeLimit,
        showCorrectAnswers: quizData.showCorrectAnswers,
        shuffleQuestions: quizData.shuffleQuestions,
      });

      if (response.code === 0) {
        console.log('[Classroom] Quiz updated successfully:', response.data);
        // Refresh activities list
        await fetchActivities();
        await fetchClassroomStatus();
        setEditQuizOpen(false);
        setEditingActivity(null);
      } else {
        throw new Error(response.message || 'Failed to update quiz');
      }
    } catch (err) {
      console.error('[Classroom] Error updating quiz:', err);
      throw err;
    }
  };

  // Handle updating discussion
  const handleUpdateDiscussion = async (discussionData) => {
    if (!editingActivity?.id) return;

    try {
      const response = await activityAPI.updateActivity(editingActivity.id, {
        title: discussionData.title,
        description: discussionData.description,
        maxLength: discussionData.maxLength,
        allowAnonymous: discussionData.allowAnonymous,
        requireApproval: discussionData.requireApproval,
      });

      if (response.code === 0) {
        console.log('[Classroom] Discussion updated successfully:', response.data);
        // Refresh activities list
        await fetchActivities();
        await fetchClassroomStatus();
        setEditDiscussionOpen(false);
        setEditingActivity(null);
      } else {
        throw new Error(response.message || 'Failed to update discussion');
      }
    } catch (err) {
      console.error('[Classroom] Error updating discussion:', err);
      throw err;
    }
  };

  // Handle deleting activity
  const handleDeleteActivity = (activityId) => {
    setDeletingActivityId(activityId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteActivity = async () => {
    if (!deletingActivityId) return;

    try {
      const response = await activityAPI.deleteActivity(deletingActivityId);

      if (response.code === 0) {
        console.log('[Classroom] Activity deleted successfully');
        // Refresh activities list
        await fetchActivities();
        await fetchClassroomStatus();
      } else {
        throw new Error(response.message || 'Failed to delete activity');
      }
    } catch (err) {
      console.error('[Classroom] Error deleting activity:', err);
      setError(err.message || 'Failed to delete activity');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingActivityId(null);
    }
  };

  if (!selectedCourse) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            No course selected. Please select a course to view classroom dashboard.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Live Classroom - {selectedCourse.courseCode}
      </Typography>

      <Grid container spacing={3}>
        {/* Session Status */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SessionStatusCard
            isConnected={isConnected}
            isClassroomActive={isClassroomActive}
            currentActivity={currentActivity}
            joinedStudentsCount={joinedStudentsCount}
            totalStudents={selectedCourse?.studentCount || 0}
          />
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <InteractiveActivitiesCard
            onCreateMCQuestion={() => setCreateQuizOpen(true)}
            onCreatePoll={() => setCreatePollOpen(true)}
            onCreateQuiz={() => setCreateQuizOpen(true)}
            onCreateDiscussion={() => setCreateDiscussionOpen(true)}
          />
        </Grid>

        {/* Active Activity Statistics - Show when there's an active activity */}
        {currentActivity ? (
          <Grid size={{ xs: 12 }}>
            <ActiveActivityStats
              key={`stats-${currentActivity.id}-${currentActivity.isActive}`}
              activity={currentActivity}
              joinedStudentsCount={joinedStudentsCount}
              totalStudents={selectedCourse?.studentCount || 0}
            />
          </Grid>
        ) : (
          console.log('[Classroom] No currentActivity to display ActiveActivityStats')
        )}

        {/* Active Activities */}
        <Grid size={{ xs: 12 }}>
          <LearningActivitiesCard
            activities={activities}
            loading={loading}
            error={error}
            totalStudents={selectedCourse?.studentCount || 0}
            onToggleActivity={handleToggleActivity}
            onCreateNew={() => setCreatePollOpen(true)}
            onEditActivity={handleEditActivity}
            onDeleteActivity={handleDeleteActivity}
          />
        </Grid>
      </Grid>

      {/* Create Poll Dialog */}
      <CreatePollDialog
        open={createPollOpen}
        onClose={() => setCreatePollOpen(false)}
        onSubmit={handleCreatePoll}
      />

      {/* Create Quiz Dialog */}
      <CreateQuizDialog
        open={createQuizOpen}
        onClose={() => setCreateQuizOpen(false)}
        onSubmit={handleCreateQuiz}
      />

      {/* Create Discussion Dialog */}
      <CreateDiscussionDialog
        open={createDiscussionOpen}
        onClose={() => setCreateDiscussionOpen(false)}
        onSubmit={handleCreateDiscussion}
      />

      {/* Edit Poll Dialog */}
      <EditPollDialog
        open={editPollOpen}
        onClose={() => {
          setEditPollOpen(false);
          setEditingActivity(null);
        }}
        onSubmit={handleUpdatePoll}
        activity={editingActivity}
      />

      {/* Edit Quiz Dialog */}
      <EditQuizDialog
        open={editQuizOpen}
        onClose={() => {
          setEditQuizOpen(false);
          setEditingActivity(null);
        }}
        onSubmit={handleUpdateQuiz}
        activity={editingActivity}
      />

      {/* Edit Discussion Dialog */}
      <EditDiscussionDialog
        open={editDiscussionOpen}
        onClose={() => {
          setEditDiscussionOpen(false);
          setEditingActivity(null);
        }}
        onSubmit={handleUpdateDiscussion}
        activity={editingActivity}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingActivityId(null);
        }}
      >
        <DialogTitle>Delete Activity</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this activity? This action cannot be undone, and all
            related submissions will be deleted as well.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeletingActivityId(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={confirmDeleteActivity} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
