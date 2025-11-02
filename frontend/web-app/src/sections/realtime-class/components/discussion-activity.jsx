'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import { useClassroomContext } from 'auth-classroom';
import { Iconify } from 'src/components/iconify';

import { activityAPI } from '../../../api/api-function-call';

// ----------------------------------------------------------------------

const DiscussionActivity = React.memo(
  ({ activity, isHistoryView = false }) => {
    const { studentState, subscribeMessage } = useClassroomContext();
    const [text, setText] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [existingSubmission, setExistingSubmission] = useState(null);
    const [error, setError] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    // Add ref for debouncing updates
    const updateTimerRef = useRef(null);

    const isActive = useMemo(() => activity?.isActive ?? false, [activity?.isActive]);
    const maxLength = useMemo(() => activity?.maxLength ?? 500, [activity?.maxLength]);
    const allowAnonymous = useMemo(
      () => activity?.allowAnonymous ?? false,
      [activity?.allowAnonymous]
    );
    const requireApproval = useMemo(
      () => activity?.requireApproval ?? false,
      [activity?.requireApproval]
    );

    // Check if student has already submitted
    const checkExistingSubmission = useCallback(async () => {
      if (!activity?.id || !studentState?.studentId) return;

      try {
        const response = await activityAPI.getStudentSubmission(
          activity.id,
          studentState.studentId
        );

        console.log('[DiscussionActivity] Check submission response:', response);

        if (response?.code === 0 && response?.data && response?.data.id) {
          setExistingSubmission(response.data);
          setHasSubmitted(true);
          setText(response.data.text || '');
          setIsAnonymous(response.data.isAnonymous || false);
          console.log('[DiscussionActivity] ✅ Found existing submission:', response.data);
        } else {
          console.log('[DiscussionActivity] No submission found');
          setHasSubmitted(false);
        }
      } catch (err) {
        console.error('[DiscussionActivity] Error checking submission:', err);
      }
    }, [activity?.id, studentState?.studentId]);

    // Load all submissions (for teacher or after student submits)
    // silent parameter prevents showing loading state during background updates
    const loadSubmissions = useCallback(
      async (silent = false) => {
        if (!activity?.id) return;

        if (!silent) {
          setLoadingSubmissions(true);
        }

        try {
          const response = await activityAPI.getActivitySubmissions(activity.id);

          if (!silent) {
            console.log('[DiscussionActivity] Load submissions response:', response);
          }

          if (response?.code === 0 && response?.data) {
            // Filter approved submissions or show all if no approval required
            const filteredSubmissions = requireApproval
              ? response.data.filter((sub) => sub.isApproved)
              : response.data;
            setSubmissions(filteredSubmissions);

            if (!silent) {
              console.log('[DiscussionActivity] 📋 Loaded submissions:', filteredSubmissions.length);
            }
          } else {
            if (!silent) {
              console.log('[DiscussionActivity] No submissions or error:', response?.message);
            }
            setSubmissions([]);
          }
        } catch (err) {
          if (!silent) {
            console.error('[DiscussionActivity] Error loading submissions:', err);
          }
          setSubmissions([]);
        } finally {
          if (!silent) {
            setLoadingSubmissions(false);
          }
        }
      },
      [activity?.id, requireApproval]
    );

    // Check existing submission on mount and when activity changes
    useEffect(() => {
      checkExistingSubmission();
    }, [checkExistingSubmission]);

    // Load submissions when activity becomes active or after submission
    useEffect(() => {
      if (isActive || hasSubmitted) {
        loadSubmissions();
      }
    }, [isActive, hasSubmitted, loadSubmissions]);

    // Subscribe to WebSocket NEW_SUBMISSION events to update submissions in real-time
    // Only subscribe if student has submitted or if active (to see others' submissions)
    useEffect(() => {
      if (!activity?.id || isHistoryView || (!hasSubmitted && !isActive)) return undefined;

      const handleMessage = (message) => {
        if (message.Type === 'NEW_SUBMISSION' && message.Payload?.activityId === activity.id) {
          console.log(
            '[DiscussionActivity] 📡 New submission detected, scheduling silent update...',
            message.Payload
          );

          // Clear any pending update
          if (updateTimerRef.current) {
            clearTimeout(updateTimerRef.current);
          }

          // Debounce updates: wait 300ms before fetching
          // This batches multiple rapid submissions into a single update
          updateTimerRef.current = setTimeout(() => {
            console.log('[DiscussionActivity] ⚡ Executing debounced update');
            loadSubmissions(true); // Silent update
            updateTimerRef.current = null;
          }, 300);
        }
      };

      const unsubscribe = subscribeMessage(handleMessage);

      // Cleanup: clear pending timer when unmounting
      return () => {
        unsubscribe();
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current);
          updateTimerRef.current = null;
        }
      };
    }, [activity?.id, hasSubmitted, isActive, isHistoryView, subscribeMessage, loadSubmissions]);

    // Handle submission
    const handleSubmit = async () => {
      if (!text.trim()) {
        setError('Please enter your response');
        return;
      }

      if (text.length > maxLength) {
        setError(`Response exceeds maximum length of ${maxLength} characters`);
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const submissionData = {
          studentId: studentState.studentId,
          text: text.trim(),
          isAnonymous,
        };

        console.log('[DiscussionActivity] 📤 Submitting response:', submissionData);

        const response = await activityAPI.submitDiscussion(activity.id, submissionData);

        if (response?.code === 0) {
          console.log('[DiscussionActivity] ✅ Response submitted successfully:', response.data);
          setHasSubmitted(true);
          setExistingSubmission(response.data);
          // Reload submissions to show the new one
          await loadSubmissions();
        } else {
          throw new Error(response?.message || 'Submission failed');
        }
      } catch (err) {
        console.error('[DiscussionActivity] ❌ Submission error:', err);
        setError(err.message || 'Failed to submit response');
      } finally {
        setIsSubmitting(false);
      }
    };

    // Render submission form
    const renderSubmissionForm = () => (
      <Card>
        <CardHeader
          title={activity?.title}
          subheader={activity?.description}
          avatar={<Iconify icon="solar:chat-round-line-bold" width={24} />}
          action={
            <Stack direction="row" spacing={1}>
              {isActive && <Chip label="Active" color="success" size="small" />}
              {hasSubmitted && <Chip label="Submitted" color="info" size="small" />}
            </Stack>
          }
        />
        <CardContent>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}

            {hasSubmitted && existingSubmission && (
              <Alert severity="success">
                Your response has been submitted
                {requireApproval && ' and is pending approval'}.
              </Alert>
            )}

            <TextField
              label="Your Response"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your thoughts..."
              multiline
              rows={6}
              fullWidth
              disabled={!isActive || hasSubmitted || isSubmitting}
              helperText={`${text.length}/${maxLength} characters`}
            />

            {allowAnonymous && (
              <FormControlLabel
                control={
                  <Switch
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    disabled={!isActive || hasSubmitted || isSubmitting}
                  />
                }
                label="Submit anonymously"
              />
            )}

            {isActive && !hasSubmitted && (
              <Button
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={isSubmitting || !text.trim()}
                startIcon={
                  isSubmitting ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Iconify icon="solar:paper-plane-bold" />
                  )
                }
              >
                {isSubmitting ? 'Submitting...' : 'Submit Response'}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    );

    // Render all submissions
    const renderSubmissions = () => {
      if (!hasSubmitted && !isActive) return null;

      return (
        <Card sx={{ mt: 3 }}>
          <CardHeader
            title="Responses"
            subheader={`${submissions.length} response${submissions.length !== 1 ? 's' : ''}`}
            avatar={<Iconify icon="solar:chat-round-dots-bold" width={24} />}
          />
          <CardContent>
            {loadingSubmissions ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : submissions.length === 0 ? (
              <Alert severity="info">No responses yet</Alert>
            ) : (
              <Stack spacing={2}>
                {submissions.map((submission, index) => (
                  <Card key={submission.id} variant="outlined">
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="caption" color="text.secondary">
                            {submission.isAnonymous ? 'Anonymous' : `Student: ${submission.studentId}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(submission.submittedAt).toLocaleString()}
                          </Typography>
                          {submission.id === existingSubmission?.id && (
                            <Chip label="You" color="primary" size="small" />
                          )}
                        </Stack>
                        <Typography variant="body2">{submission.text}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      );
    };

    if (!activity) {
      return null;
    }

    return (
      <Box>
        {renderSubmissionForm()}
        {renderSubmissions()}
      </Box>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for React.memo
    return (
      prevProps.activity?.id === nextProps.activity?.id &&
      prevProps.activity?.isActive === nextProps.activity?.isActive &&
      prevProps.activity?.submissionCount === nextProps.activity?.submissionCount
    );
  }
);

export default DiscussionActivity;
