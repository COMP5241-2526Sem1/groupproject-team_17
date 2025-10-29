import { useClassroomContext } from 'auth-classroom';
import { useCallback, useEffect, useState } from 'react';
import { activityAPI } from 'src/api/api-function-call';

// ----------------------------------------------------------------------

export function useClassroomActivities() {
  const { classroomState, isAuthencated, subscribeMessage } = useClassroomContext();
  const [currentActivity, setCurrentActivity] = useState(null);
  const [activities, setActivities] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [error, setError] = useState(null);

  const courseId = classroomState.courseId;

  // Fetch all activities for the course
  const fetchActivities = useCallback(async () => {
    if (!courseId) return;

    try {
      const response = await activityAPI.getCourseActivities(courseId, false);
      if (response.code === 0 && response.data) {
        const transformedActivities = response.data.map((activity) => {
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
            status,
            isActive: activity.isActive,
            hasBeenActivated: activity.hasBeenActivated || false,
            expiresAt: activity.expiresAt,
          };
        });

        setActivities(transformedActivities);

        // Find current active activity
        const activeActivity = response.data.find((a) => a.isActive);
        if (activeActivity) {
          fetchActivityDetails(activeActivity.id);
        } else {
          // No active activity, clear current activity
          setCurrentActivity(null);
        }
      }
    } catch (err) {
      console.error('[useClassroomActivities] Failed to fetch activities:', err);
      setError(err.message);
    }
  }, [courseId]);

  // Fetch detailed activity data
  const fetchActivityDetails = useCallback(async (activityId) => {
    try {
      const response = await activityAPI.getActivity(activityId);
      if (response.code === 0 && response.data) {
        const activity = response.data;
        const transformedActivity = {
          id: activity.id,
          type: activity.type === 1 ? 'quiz' : activity.type === 2 ? 'poll' : 'discussion',
          title: activity.title,
          description: activity.description,
          isActive: activity.isActive,
          expiresAt: activity.expiresAt,
          // Type-specific data
          ...(activity.type === 1 && {
            // Quiz
            questions: activity.questions || [],
            timeLimit: activity.quiz_TimeLimit,
            showCorrectAnswers: activity.quiz_ShowCorrectAnswers,
            shuffleQuestions: activity.quiz_ShuffleQuestions,
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
            requireApproval: activity.discussion_RequireApproval,
          }),
        };

        setCurrentActivity(transformedActivity);
      }
    } catch (err) {
      console.error('[useClassroomActivities] Failed to fetch activity details:', err);
      setError(err.message);
    }
  }, []);

  // WebSocket message handler
  useEffect(() => {
    if (!isAuthencated || !courseId) {
      return undefined;
    }

    const handleMessage = (message) => {
      if (!message || !message.Type) return;

      console.log('[useClassroomActivities] WebSocket message:', message);

      switch (message.Type) {
        case 'CONNECTED':
          console.log('[useClassroomActivities] Connected to classroom:', message.Payload);
          if (message.Payload?.onlineStudentsCount !== undefined) {
            setOnlineCount(message.Payload.onlineStudentsCount);
          }
          // Fetch initial activities
          fetchActivities();
          break;

        case 'ACTIVITY_CREATED':
          console.log('[useClassroomActivities] New activity created:', message.Payload);
          // Refresh activities list
          fetchActivities();
          break;

        case 'ACTIVITY_UPDATED':
          console.log('[useClassroomActivities] Activity updated:', message.Payload);
          // Update activities list
          setActivities((prev) =>
            prev.map((activity) => {
              if (activity.id === message.Payload.activityId) {
                const isActive = message.Payload.isActive;
                const hasBeenActivated = message.Payload.hasBeenActivated;

                // Calculate status
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
                  isActive,
                  hasBeenActivated,
                  status,
                  title: message.Payload.title || activity.title,
                  description: message.Payload.description || activity.description,
                };
              }
              return activity;
            })
          );

          // If activity was activated, set it as current and fetch full details
          if (message.Payload.isActive) {
            console.log(
              '[useClassroomActivities] Fetching details for activated activity:',
              message.Payload.activityId
            );
            fetchActivityDetails(message.Payload.activityId);
          }
          break;

        case 'ACTIVITY_DELETED':
          console.log('[useClassroomActivities] Activity deleted:', message.Payload);
          setActivities((prev) => prev.filter((a) => a.id !== message.Payload.activityId));
          if (currentActivity?.id === message.Payload.activityId) {
            setCurrentActivity(null);
          }
          break;

        case 'ACTIVITY_DEACTIVATED':
          console.log('[useClassroomActivities] Activity deactivated:', message.Payload);
          console.log('[useClassroomActivities] Current activity before clear:', currentActivity?.id);

          setActivities((prev) =>
            prev.map((activity) =>
              activity.id === message.Payload.activityId
                ? {
                  ...activity,
                  isActive: false,
                  hasBeenActivated: message.Payload.hasBeenActivated ?? true,
                  status: 'completed',
                }
                : activity
            )
          );

          if (currentActivity?.id === message.Payload.activityId) {
            console.log('[useClassroomActivities] Clearing current activity');
            setCurrentActivity(null);
          }
          break;

        case 'STUDENT_JOINED':
          console.log('[useClassroomActivities] Student joined:', message.Payload);
          if (message.Payload?.onlineStudentsCount !== undefined) {
            setOnlineCount(message.Payload.onlineStudentsCount);
          }
          break;

        case 'STUDENT_LEFT':
          console.log('[useClassroomActivities] Student left:', message.Payload);
          if (message.Payload?.onlineStudentsCount !== undefined) {
            setOnlineCount(message.Payload.onlineStudentsCount);
          }
          break;

        default:
          console.log('[useClassroomActivities] Unknown message type:', message.Type);
      }
    };

    // Subscribe to messages from ClassroomProvider
    const unsubscribe = subscribeMessage(handleMessage);

    // Fetch initial data
    fetchActivities();

    // Cleanup
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthencated, courseId, subscribeMessage]);

  return {
    currentActivity,
    activities,
    onlineCount,
    error,
    fetchActivities,
    fetchActivityDetails,
  };
}
