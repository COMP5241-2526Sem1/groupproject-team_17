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

import { useSelector } from 'src/redux/hooks';

import { activityAPI, realtimeClassAPI } from 'src/api/api-function-call';
import { useInstructorWebSocket } from 'src/contexts';
import CreatePollDialog from './classroom-create-activity/create-poll-dialog';
import EditPollDialog from './classroom-create-activity/edit-poll-dialog';
import {
  InteractiveActivitiesCard,
  LearningActivitiesCard,
  SessionStatusCard,
} from './classroom-session';

// ----------------------------------------------------------------------

export default function CourseDetailsClassroom() {
  const { selectedCourse } = useSelector((state) => state.classManagement);

  // Mock classroom data for UI display (can be replaced with API data later)
  const [classroomData] = useState({
    isActive: true,
    sessionMode: 'interactive',
    engagementScore: 85,
    activitiesCompleted: 12,
    pendingResponses: 8,
  });

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time classroom status
  const [joinedStudentsCount, setJoinedStudentsCount] = useState(0);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [isClassroomActive, setIsClassroomActive] = useState(false);

  // Dialog states
  const [createPollOpen, setCreatePollOpen] = useState(false);
  const [editPollOpen, setEditPollOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState(null);

  // WebSocket connection from context
  const { isConnected, subscribeMessage, unsubscribeMessage } = useInstructorWebSocket();

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

                return {
                  ...activity,
                  isActive: isActive,
                  hasBeenActivated: hasBeenActivated,
                  status: status,
                  title: message.Payload.title || activity.title,
                  description: message.Payload.description || activity.description,
                };
              }
              return activity;
            })
          );
          fetchClassroomStatus(); // Refresh to update current activity
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
      const response = await realtimeClassAPI.getClassroomStatus(selectedCourse.id);

      if (response.code === 0 && response.data) {
        setJoinedStudentsCount(response.data.joinedStudentsCount || 0);
        setCurrentActivity(response.data.currentActivity || null);
        setIsClassroomActive(response.data.isClassroomActive || false);
      }
    } catch (err) {
      console.error('Failed to fetch classroom status:', err);
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

      // Transform API data to match component structure
      const transformedActivities = response.data.map((activity) => {
        // Calculate status based on isActive and hasBeenActivated
        let status;
        if (activity.isActive) {
          status = 'active';
        } else if (activity.hasBeenActivated) {
          status = 'completed';
        } else {
          status = 'pending';
        }

        return {
          id: activity.id,
          type: activity.type === 1 ? 'quiz' : activity.type === 2 ? 'poll' : 'discussion',
          title: activity.title,
          description: activity.description,
          status: status,
          isActive: activity.isActive,
          hasBeenActivated: activity.hasBeenActivated || false,
          createdAt: activity.createdAt,
          expiresAt: activity.expiresAt,
          // Type-specific data
          ...(activity.type === 1 && {
            // Quiz
            questions: activity.questions || [],
            timeLimit: activity.quiz_TimeLimit,
            showCorrectAnswers: activity.quiz_ShowCorrectAnswers,
          }),
          ...(activity.type === 2 && {
            // Poll
            options: activity.options || [],
            allowMultipleSelections: activity.poll_AllowMultipleSelections,
            isAnonymous: activity.poll_IsAnonymous,
          }),
          ...(activity.type === 3 && {
            // Discussion
            maxLength: activity.discussion_MaxLength,
            allowAnonymous: activity.discussion_AllowAnonymous,
          }),
        };
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
        // TODO: Open quiz edit dialog
        console.log('Quiz editing not implemented yet');
        break;
      case 'discussion':
        // TODO: Open discussion edit dialog
        console.log('Discussion editing not implemented yet');
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
            engagementScore={classroomData.engagementScore}
            joinedStudentsCount={joinedStudentsCount}
            totalStudents={selectedCourse?.studentCount || 0}
            sessionMode={classroomData.sessionMode}
            activitiesCompleted={classroomData.activitiesCompleted}
            pendingResponses={classroomData.pendingResponses}
          />
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <InteractiveActivitiesCard
            onCreatePoll={() => setCreatePollOpen(true)}
            onCreateQuiz={() => {
              // TODO: Implement quiz creation
              console.log('Create quiz clicked');
            }}
          />
        </Grid>

        {/* Active Activities */}
        <Grid size={{ xs: 12 }}>
          <LearningActivitiesCard
            activities={activities}
            loading={loading}
            error={error}
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
