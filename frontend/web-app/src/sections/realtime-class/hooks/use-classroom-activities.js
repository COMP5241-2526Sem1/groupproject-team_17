import { useClassroomContext } from 'auth-classroom';
import { useCallback, useEffect, useRef, useState } from 'react';

import { activityAPI } from 'src/api/api-function-call';

// ----------------------------------------------------------------------

export function useClassroomActivities() {
  const { classroomState, isAuthencated, subscribeMessage, studentState } = useClassroomContext();
  const [currentActivity, setCurrentActivity] = useState(null);
  const [activities, setActivities] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [error, setError] = useState(null);

  const courseId = classroomState.courseId;
  const studentId = studentState?.studentId;

  // Store current activity ID to avoid unnecessary re-fetches
  const currentActivityIdRef = useRef(null);

  // Fetch detailed activity data
  const fetchActivityDetails = useCallback(async (activityId) => {
    try {
      console.log('[useClassroomActivities] 📥 Fetching activity details for:', activityId);
      const response = await activityAPI.getActivity(activityId);

      console.log('[useClassroomActivities] 📦 Raw activity response:', {
        code: response.code,
        hasData: !!response.data,
        activityId: response.data?.id,
        type: response.data?.type,
        createdAt: response.data?.createdAt,
        timeLimit: response.data?.quiz_TimeLimit,
      });

      if (response.code === 0 && response.data) {
        const activity = response.data;
        const transformedActivity = {
          id: activity.id,
          type: activity.type === 1 ? 'quiz' : activity.type === 2 ? 'poll' : 'discussion',
          title: activity.title,
          description: activity.description,
          isActive: activity.isActive,
          expiresAt: activity.expiresAt,
          createdAt: activity.createdAt, // Add createdAt for timer calculation
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

        console.log('[useClassroomActivities] ✅ Transformed activity:', {
          id: transformedActivity.id,
          type: transformedActivity.type,
          isActive: transformedActivity.isActive,
          createdAt: transformedActivity.createdAt,
          timeLimit: transformedActivity.timeLimit,
          hasCreatedAt: !!transformedActivity.createdAt,
          hasTimeLimit: !!transformedActivity.timeLimit,
        });

        setCurrentActivity(transformedActivity);
      }
    } catch (err) {
      console.error('[useClassroomActivities] ❌ Failed to fetch activity details:', err);
      setError(err.message);
    }
  }, []);

  // Fetch all activities for the course
  const fetchActivities = useCallback(async () => {
    if (!courseId) return;

    try {
      const response = await activityAPI.getCourseActivities(courseId, false);
      if (response.code === 0 && response.data) {
        const transformedActivities = await Promise.all(
          response.data.map(async (activity) => {
            let status;
            if (activity.isActive) {
              status = 'active';
            } else if (activity.hasBeenActivated) {
              status = 'completed';
            } else {
              status = 'pending';
            }

            // Check if student has submitted for this activity
            let hasSubmitted = false;
            if (studentId && activity.id) {
              try {
                const submissionResponse = await activityAPI.getStudentSubmission(
                  activity.id,
                  studentId
                );
                hasSubmitted = submissionResponse.code === 0 && submissionResponse.data?.id;
              } catch {
                // If 404 or error, student hasn't submitted
                hasSubmitted = false;
              }
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
              hasSubmitted, // Add submission status
            };
          })
        );

        setActivities(transformedActivities);

        // Find current active activity
        const activeActivity = response.data.find((a) => a.isActive);
        if (activeActivity) {
          // Only fetch details if the active activity changed
          if (currentActivityIdRef.current !== activeActivity.id) {
            currentActivityIdRef.current = activeActivity.id;
            fetchActivityDetails(activeActivity.id);
          }
        } else {
          // No active activity, clear current activity
          if (currentActivityIdRef.current !== null) {
            currentActivityIdRef.current = null;
            setCurrentActivity(null);
          }
        }
      }
    } catch (err) {
      console.error('[useClassroomActivities] Failed to fetch activities:', err);
      setError(err.message);
    }
  }, [courseId, studentId, fetchActivityDetails]);

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
          console.log('[useClassroomActivities] 📡 Activity updated WebSocket message:', {
            activityId: message.Payload.activityId,
            isActive: message.Payload.isActive,
            hasBeenActivated: message.Payload.hasBeenActivated,
            hasCreatedAt: !!message.Payload.createdAt,
            createdAt: message.Payload.createdAt,
            hasTimeLimit: !!message.Payload.timeLimit,
            timeLimit: message.Payload.timeLimit,
            isCurrentActivity: currentActivity?.id === message.Payload.activityId,
          });

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

                const updated = {
                  ...activity,
                  isActive,
                  hasBeenActivated,
                  status,
                  title: message.Payload.title || activity.title,
                  description: message.Payload.description || activity.description,
                  // Include createdAt and timeLimit from WebSocket message if available
                  ...(message.Payload.createdAt && { createdAt: message.Payload.createdAt }),
                  ...(message.Payload.timeLimit && { timeLimit: message.Payload.timeLimit }),
                };

                console.log('[useClassroomActivities] 🔄 Updated activity in list:', {
                  id: updated.id,
                  hasCreatedAt: !!updated.createdAt,
                  createdAt: updated.createdAt,
                  hasTimeLimit: !!updated.timeLimit,
                  timeLimit: updated.timeLimit,
                });

                return updated;
              }
              return activity;
            })
          );

          // Update current activity if it's the one being updated
          if (currentActivity?.id === message.Payload.activityId) {
            console.log('[useClassroomActivities] 🔄 Updating current activity via WebSocket');
            setCurrentActivity((prev) => {
              const updated = {
                ...prev,
                isActive: message.Payload.isActive,
                hasBeenActivated: message.Payload.hasBeenActivated,
                title: message.Payload.title || prev.title,
                description: message.Payload.description || prev.description,
                // Include createdAt and timeLimit from WebSocket message if available
                ...(message.Payload.createdAt && { createdAt: message.Payload.createdAt }),
                ...(message.Payload.timeLimit && { timeLimit: message.Payload.timeLimit }),
              };

              console.log('[useClassroomActivities] ✅ Current activity updated:', {
                id: updated.id,
                type: updated.type,
                isActive: updated.isActive,
                hasCreatedAt: !!updated.createdAt,
                createdAt: updated.createdAt,
                hasTimeLimit: !!updated.timeLimit,
                timeLimit: updated.timeLimit,
              });

              return updated;
            });
          }

          // If activity was activated and not already current, fetch full details
          if (message.Payload.isActive && currentActivity?.id !== message.Payload.activityId) {
            console.log(
              '[useClassroomActivities] 📥 Activity activated - fetching full details:',
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

        case 'NEW_SUBMISSION':
          console.log('[useClassroomActivities] 📤 New submission received:', message.Payload);
          // If current student submitted, update the hasSubmitted flag for that activity
          if (message.Payload?.studentId === studentId && message.Payload?.activityId) {
            console.log('[useClassroomActivities] ✅ Current student submitted, updating activities list');
            setActivities((prev) =>
              prev.map((activity) =>
                activity.id === message.Payload.activityId
                  ? { ...activity, hasSubmitted: true }
                  : activity
              )
            );
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
