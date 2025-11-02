import { useClassroomContext } from 'auth-classroom';
import { useMemo, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Card,
  Chip,
  Alert,
  Radio,
  Stack,
  Button,
  Checkbox,
  RadioGroup,
  Typography,
  CardContent,
  LinearProgress,
  CircularProgress,
  FormControlLabel,
} from '@mui/material';

import { activityAPI } from 'src/api/api-function-call';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function PollActivity({ activity, onSubmitSuccess, isHistoryView = false }) {
  const { studentState, subscribeMessage } = useClassroomContext();
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCheckingSubmission, setIsCheckingSubmission] = useState(true);
  const [pollResults, setPollResults] = useState(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState(null);

  const allowMultiple = activity.allowMultipleSelections ?? false;
  // In history view, students can still submit if they haven't already
  const isActive = activity.isActive && !isHistoryView;
  const canSubmit = !hasSubmitted; // Can submit if not yet submitted, regardless of history view

  // Load poll results (all submissions)
  const loadPollResults = useCallback(async () => {
    if (!activity?.id) {
      console.warn('[PollActivity] Cannot load results: no activity ID');
      return;
    }

    console.log('[PollActivity] Loading poll results for activity:', activity.id);
    setIsLoadingResults(true);
    try {
      const response = await activityAPI.getActivitySubmissions(activity.id);

      console.log('[PollActivity] API response:', response);

      if (response.code === 0 && response.data) {
        console.log('[PollActivity] Poll results loaded successfully:', {
          count: response.data.length,
          data: response.data,
        });
        // Create a new array to ensure state change is detected
        setPollResults([...response.data]);
      } else {
        console.warn('[PollActivity] Failed to load results:', response);
        setPollResults([]);
      }
    } catch (err) {
      console.error('[PollActivity] Failed to load results:', err);
      setPollResults([]);
    } finally {
      setIsLoadingResults(false);
    }
  }, [activity?.id]);

  // Calculate statistics from submissions using useMemo for better performance
  const statistics = useMemo(() => {
    console.log('[PollActivity] Calculating statistics...', {
      pollResults,
      pollResultsLength: pollResults?.length,
      optionsLength: activity.options?.length,
    });

    if (!activity.options || activity.options.length === 0) {
      console.error('[PollActivity] No options available!');
      return [];
    }

    if (!pollResults || pollResults.length === 0) {
      console.log('[PollActivity] No submissions yet, returning zeros');
      return activity.options.map(() => ({ count: 0, percentage: 0 }));
    }

    const totalSubmissions = pollResults.length;
    const optionCounts = new Array(activity.options.length).fill(0);

    console.log('[PollActivity] Initial optionCounts:', optionCounts);

    // Count votes for each option
    pollResults.forEach((submission, subIndex) => {
      console.log(`[PollActivity] Processing submission ${subIndex}:`, submission);

      // Try different possible field names (backend serialization might vary)
      let selectedOptions =
        submission.selectedOptions ||
        submission.SelectedOptions ||
        submission.poll_SelectedOptions ||
        [];

      console.log(`[PollActivity] Raw selectedOptions (submission ${subIndex}):`, selectedOptions);

      // If selectedOptions is a string (JSON), parse it
      if (typeof selectedOptions === 'string') {
        try {
          selectedOptions = JSON.parse(selectedOptions);
          console.log(`[PollActivity] Parsed selectedOptions (submission ${subIndex}):`, selectedOptions);
        } catch (e) {
          console.error('[PollActivity] Failed to parse selectedOptions:', e);
          selectedOptions = [];
        }
      }

      if (Array.isArray(selectedOptions)) {
        console.log(`[PollActivity] Processing ${selectedOptions.length} selected options`);
        selectedOptions.forEach((optionIndex) => {
          const index = typeof optionIndex === 'number' ? optionIndex : parseInt(optionIndex, 10);
          console.log(`[PollActivity] Option index: ${optionIndex} -> parsed: ${index}`);

          if (!isNaN(index) && index >= 0 && index < optionCounts.length) {
            optionCounts[index] += 1;
            console.log(`[PollActivity] Incremented optionCounts[${index}] to ${optionCounts[index]}`);
          } else {
            console.warn(`[PollActivity] Invalid index: ${index} (length: ${optionCounts.length})`);
          }
        });
      } else {
        console.warn(`[PollActivity] selectedOptions is not an array:`, typeof selectedOptions);
      }
    });

    console.log('[PollActivity] Final option counts:', optionCounts);

    // Calculate percentages
    const calculatedStats = optionCounts.map((count, index) => {
      const percentage = totalSubmissions > 0 ? (count / totalSubmissions) * 100 : 0;
      console.log(`[PollActivity] Option ${index}: count=${count}, percentage=${percentage.toFixed(1)}%`);
      return {
        count,
        percentage,
      };
    });

    console.log('[PollActivity] Final statistics:', calculatedStats);
    return calculatedStats;
  }, [pollResults, activity.options]);

  // Check if student has already submitted when component mounts or activity changes
  useEffect(() => {
    const checkExistingSubmission = async () => {
      if (!activity?.id || !studentState?.studentId) {
        console.log('[PollActivity] Missing activity ID or student ID:', {
          activityId: activity?.id,
          studentId: studentState?.studentId,
        });
        return;
      }

      setIsCheckingSubmission(true);
      try {
        const response = await activityAPI.getStudentSubmission(
          activity.id,
          studentState.studentId
        );

        console.log('[PollActivity] Check submission response:', response);

        // If we get a submission back, student has already submitted
        // Make sure response.data is not null or undefined
        if (response.code === 0 && response.data && response.data.id) {
          console.log('[PollActivity] Student has already submitted:', response.data);
          setHasSubmitted(true);
          // Load results immediately (don't await to avoid blocking)
          loadPollResults();
        } else {
          console.log('[PollActivity] No submission found or invalid response');
          setHasSubmitted(false);
        }
      } catch (err) {
        // If error is 404 or submission not found, that's okay - student hasn't submitted yet
        console.log('[PollActivity] No existing submission found (this is ok)', err);
        setHasSubmitted(false);
      } finally {
        setIsCheckingSubmission(false);
      }
    };

    checkExistingSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id, studentState?.studentId]);

  // Subscribe to WebSocket NEW_SUBMISSION events to update results in real-time
  // Only subscribe if not in history view mode
  useEffect(() => {
    if (!hasSubmitted || !activity?.id || isHistoryView) return undefined;

    const handleMessage = (message) => {
      if (message.Type === 'NEW_SUBMISSION' && message.Payload?.activityId === activity.id) {
        console.log('[PollActivity] New submission detected, reloading results...');
        loadPollResults();
      }
    };

    const unsubscribe = subscribeMessage(handleMessage);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSubmitted, activity?.id, subscribeMessage, isHistoryView]);

  // Debug: Log pollResults changes
  useEffect(() => {
    console.log('[PollActivity] pollResults changed:', {
      pollResults,
      length: pollResults?.length,
      hasSubmitted,
    });
  }, [pollResults, hasSubmitted]);

  // Debug: Log statistics changes
  useEffect(() => {
    console.log('[PollActivity] statistics updated:', {
      statistics,
      pollResultsLength: pollResults?.length,
    });
  }, [statistics, pollResults]);

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

  // Check if activity data is incomplete
  if (!activity.options || activity.options.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            <Typography variant="subtitle2" gutterBottom>
              Activity data is incomplete
            </Typography>
            <Typography variant="body2">
              This activity does not have any options. Please contact your instructor.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show submitted state if student has already answered
  if (hasSubmitted) {
    const totalVotes = pollResults?.length || 0;

    console.log('[PollActivity] Rendering results:', {
      pollResults,
      statistics,
      totalVotes,
      optionsLength: activity.options?.length,
    });

    // Determine status for display
    const statusLabel = isHistoryView ? 'COMPLETED' : 'SUBMITTED';
    const statusColor = isHistoryView ? 'info' : 'success';
    const statusIcon = isHistoryView ? 'solar:history-bold' : 'solar:check-circle-bold';

    return (
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h5">{activity.title}</Typography>
              <Chip
                label={statusLabel}
                color={statusColor}
                icon={<Iconify icon={statusIcon} />}
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
                  Poll Results
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
                      <Box key={`${index}-${stat.count}-${stat.percentage}`}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ mb: 0.5 }}
                        >
                          <Typography variant="body2">{option.text}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                transition: 'all 0.3s ease-in-out',
                              }}
                              key={`count-${stat.count}`}
                            >
                              {stat.count} {stat.count === 1 ? 'vote' : 'votes'}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              fontWeight="bold"
                              sx={{ 
                                transition: 'all 0.3s ease-in-out',
                              }}
                              key={`percent-${stat.percentage}`}
                            >
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
                            transition: 'all 0.3s ease-in-out',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 1,
                              bgcolor: 'primary.main',
                              transition: 'transform 0.5s ease-in-out',
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
              {isHistoryView
                ? 'Historical activity - Results are not updated in real-time'
                : 'Thank you! Results are updated in real-time.'}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // Determine status for unsubmitted state
  const statusLabel = isHistoryView ? 'HISTORICAL' : isActive ? 'ACTIVE' : 'INACTIVE';
  const statusColor = isHistoryView ? 'info' : isActive ? 'success' : 'default';
  const statusIcon = isHistoryView
    ? 'solar:history-bold'
    : isActive
      ? 'solar:play-circle-bold'
      : 'solar:pause-circle-bold';

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5">{activity.title}</Typography>
            <Chip label={statusLabel} color={statusColor} icon={<Iconify icon={statusIcon} />} />
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
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
