import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

import { useClassroomContext } from 'auth-classroom';
import { activityAPI } from 'src/api/api-function-call';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function PollActivity({ activity, onSubmitSuccess }) {
  const { studentState, subscribeMessage } = useClassroomContext();
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCheckingSubmission, setIsCheckingSubmission] = useState(true);
  const [pollResults, setPollResults] = useState(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState(null);

  const allowMultiple = activity.allowMultipleSelections ?? false;

  // Load poll results (all submissions)
  const loadPollResults = useCallback(async () => {
    if (!activity?.id) return;

    setIsLoadingResults(true);
    try {
      const response = await activityAPI.getActivitySubmissions(activity.id);

      if (response.code === 0 && response.data) {
        console.log('[PollActivity] Poll results:', response.data);
        setPollResults(response.data);
      }
    } catch (err) {
      console.error('[PollActivity] Failed to load results:', err);
    } finally {
      setIsLoadingResults(false);
    }
  }, [activity?.id]);

  // Calculate statistics from submissions
  const calculateStatistics = useCallback(() => {
    console.log('[PollActivity] Calculating statistics...', {
      pollResults,
      pollResultsLength: pollResults?.length,
      optionsLength: activity.options?.length,
    });

    if (!pollResults || pollResults.length === 0) {
      return activity.options?.map(() => ({ count: 0, percentage: 0 })) || [];
    }

    const totalSubmissions = pollResults.length;
    const optionCounts = new Array(activity.options?.length || 0).fill(0);

    // Count votes for each option
    pollResults.forEach((submission) => {
      console.log('[PollActivity] Processing submission:', submission);

      // Try different possible field names (case-insensitive)
      const selectedOptions =
        submission.selectedOptions ||
        submission.SelectedOptions ||
        submission.poll_SelectedOptions ||
        [];

      if (Array.isArray(selectedOptions)) {
        selectedOptions.forEach((optionIndex) => {
          if (typeof optionIndex === 'number' && optionIndex >= 0 && optionIndex < optionCounts.length) {
            optionCounts[optionIndex] += 1;
          }
        });
      }
    });

    console.log('[PollActivity] Option counts:', optionCounts);

    // Calculate percentages
    return optionCounts.map((count) => ({
      count,
      percentage: totalSubmissions > 0 ? (count / totalSubmissions) * 100 : 0,
    }));
  }, [pollResults, activity.options]);

  // Check if student has already submitted when component mounts or activity changes
  useEffect(() => {
    const checkExistingSubmission = async () => {
      if (!activity?.id || !studentState?.studentId) return;

      setIsCheckingSubmission(true);
      try {
        const response = await activityAPI.getStudentSubmission(
          activity.id,
          studentState.studentId
        );

        // If we get a submission back, student has already submitted
        if (response.code === 0 && response.data) {
          console.log('[PollActivity] Student has already submitted:', response.data);
          setHasSubmitted(true);
          // Load results immediately (don't await to avoid blocking)
          loadPollResults();
        }
      } catch (err) {
        // If error is 404 or submission not found, that's okay - student hasn't submitted yet
        console.log('[PollActivity] No existing submission found (this is ok)');
      } finally {
        setIsCheckingSubmission(false);
      }
    };

    checkExistingSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id, studentState?.studentId]);

  // Subscribe to WebSocket NEW_SUBMISSION events to update results in real-time
  useEffect(() => {
    if (!hasSubmitted || !activity?.id) return undefined;

    const handleMessage = (message) => {
      if (message.Type === 'NEW_SUBMISSION' && message.Payload?.activityId === activity.id) {
        console.log('[PollActivity] New submission detected, reloading results...');
        loadPollResults();
      }
    };

    const unsubscribe = subscribeMessage(handleMessage);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSubmitted, activity?.id, subscribeMessage]);

  // Handle single selection (radio) - use index
  const handleRadioChange = (event) => {
    const optionIndex = parseInt(event.target.value, 10);
    setSelectedOptions([optionIndex]);
    setError(null);
  };

  // Handle multiple selection (checkbox) - use index
  const handleCheckboxChange = (optionIndex) => {
    setSelectedOptions((prev) => {
      if (prev.includes(optionIndex)) {
        return prev.filter((idx) => idx !== optionIndex);
      }
      return [...prev, optionIndex];
    });
    setError(null);
  };

  // Submit poll response
  const handleSubmit = async () => {
    if (selectedOptions.length === 0) {
      setError('Please select at least one option');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await activityAPI.submitPoll(activity.id, {
        studentId: studentState.studentId,
        selectedOptions,
      });

      if (response.code === 0) {
        console.log('[PollActivity] Submission successful:', response.data);
        setHasSubmitted(true);
        // Load results after successful submission
        await loadPollResults();
        if (onSubmitSuccess) {
          onSubmitSuccess(response.data);
        }
      } else {
        setError(response.message || 'Failed to submit poll');
      }
    } catch (err) {
      console.error('[PollActivity] Submission error:', err);
      setError(err.message || 'Failed to submit poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking if student has already submitted
  if (isCheckingSubmission) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading activity...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // Show submitted state if student has already answered
  if (hasSubmitted) {
    const statistics = calculateStatistics();
    const totalVotes = pollResults?.length || 0;

    console.log('[PollActivity] Rendering results:', {
      pollResults,
      statistics,
      totalVotes,
      optionsLength: activity.options?.length,
    });

    return (
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h5">{activity.title}</Typography>
              <Chip
                label="SUBMITTED"
                color="success"
                icon={<Iconify icon="solar:check-circle-bold" />}
              />
            </Stack>

            {activity.description && (
              <Typography variant="body2" color="text.secondary">
                {activity.description}
              </Typography>
            )}

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  投票結果
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {totalVotes} {totalVotes === 1 ? 'response' : 'responses'}
                </Typography>
              </Stack>

              {isLoadingResults ? (
                <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="text.secondary">
                    Loading results...
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  {activity.options?.map((option, index) => {
                    const stat = statistics[index] || { count: 0, percentage: 0 };
                    return (
                      <Box key={index}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ mb: 0.5 }}
                        >
                          <Typography variant="body2">{option.text}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              {stat.count} {stat.count === 1 ? 'vote' : 'votes'}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {stat.percentage.toFixed(1)}%
                            </Typography>
                          </Stack>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={stat.percentage}
                          sx={{
                            height: 8,
                            borderRadius: 1,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 1,
                              bgcolor: 'primary.main',
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" textAlign="center">
              感謝你的參與！Results are updated in real-time.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5">{activity.title}</Typography>
            <Chip label="ACTIVE" color="success" icon={<Iconify icon="solar:play-circle-bold" />} />
          </Stack>

          {activity.description && (
            <Typography variant="body2" color="text.secondary">
              {activity.description}
            </Typography>
          )}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {allowMultiple ? 'Select one or more options:' : 'Select one option:'}
            </Typography>

            {allowMultiple ? (
              // Multiple selection with checkboxes
              <Stack spacing={1}>
                {activity.options?.map((option, index) => (
                  <Card
                    key={index}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      border: selectedOptions.includes(index) ? 2 : 1,
                      borderColor: selectedOptions.includes(index)
                        ? 'primary.main'
                        : 'divider',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => handleCheckboxChange(index)}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedOptions.includes(index)}
                          onChange={() => handleCheckboxChange(index)}
                        />
                      }
                      label={option.text}
                      sx={{ width: '100%', m: 0 }}
                    />
                  </Card>
                ))}
              </Stack>
            ) : (
              // Single selection with radio buttons
              <RadioGroup value={selectedOptions[0] ?? ''} onChange={handleRadioChange}>
                <Stack spacing={1}>
                  {activity.options?.map((option, index) => (
                    <Card
                      key={index}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        border: selectedOptions.includes(index) ? 2 : 1,
                        borderColor: selectedOptions.includes(index)
                          ? 'primary.main'
                          : 'divider',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover',
                        },
                      }}
                      onClick={() => setSelectedOptions([index])}
                    >
                      <FormControlLabel
                        value={index}
                        control={<Radio />}
                        label={option.text}
                        sx={{ width: '100%', m: 0 }}
                      />
                    </Card>
                  ))}
                </Stack>
              </RadioGroup>
            )}
          </Box>

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedOptions.length === 0}
            startIcon={<Iconify icon="solar:check-circle-bold" />}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
