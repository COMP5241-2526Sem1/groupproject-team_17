import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useClassroomContext } from 'auth-classroom';
import { activityAPI } from 'src/api/api-function-call';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// Memoized component for individual quiz question
const QuizQuestion = memo(({ question, questionIndex, selectedAnswer, onAnswerSelect, isSubmitted }) => (
  <Card
    variant="outlined"
    sx={{
      p: 2,
      transition: 'all 0.3s ease-in-out',
    }}
  >
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Chip
          label={`Q${questionIndex + 1}`}
          size="small"
          color="primary"
          sx={{ mt: 0.5 }}
        />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {question.text}
          </Typography>
          {question.points && (
            <Typography variant="caption" color="text.secondary">
              {question.points} {question.points === 1 ? 'point' : 'points'}
            </Typography>
          )}
        </Box>
      </Stack>

      <RadioGroup
        value={selectedAnswer ?? ''}
        onChange={(e) => onAnswerSelect(questionIndex, parseInt(e.target.value, 10))}
      >
        <Stack spacing={1}>
          {question.options?.map((option, optionIndex) => (
            <Card
              key={optionIndex}
              variant="outlined"
              sx={{
                p: 1.5,
                cursor: isSubmitted ? 'default' : 'pointer',
                border: selectedAnswer === optionIndex ? 2 : 1,
                borderColor: selectedAnswer === optionIndex ? 'primary.main' : 'divider',
                '&:hover': !isSubmitted && {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => !isSubmitted && onAnswerSelect(questionIndex, optionIndex)}
            >
              <FormControlLabel
                value={optionIndex}
                control={<Radio disabled={isSubmitted} />}
                label={option}
                sx={{ width: '100%', m: 0 }}
              />
            </Card>
          ))}
        </Stack>
      </RadioGroup>
    </Stack>
  </Card>
));

// ----------------------------------------------------------------------

function QuizActivityComponent({ activity, onSubmitSuccess, isHistoryView = false }) {
  const { studentState } = useClassroomContext();
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCheckingSubmission, setIsCheckingSubmission] = useState(true);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null); // Track when student started the quiz

  const isActive = activity.isActive && !isHistoryView;
  const timeLimit = activity.timeLimit || 0;
  const totalQuestions = activity.questions?.length || 0;

  // Debug: Log activity data when it changes
  console.log('[QuizActivity] Activity data:', {
    id: activity.id,
    title: activity.title,
    isActive: activity.isActive,
    isHistoryView,
    createdAt: activity.createdAt,
    timeLimit,
    hasCreatedAt: !!activity.createdAt,
    createdAtType: typeof activity.createdAt,
    timeLimitType: typeof timeLimit,
  });

  // Calculate expiration time based on activity's createdAt + timeLimit
  // Backend sends UTC timestamps, JavaScript Date handles UTC correctly
  // Note: We ONLY use createdAt + timeLimit, ignoring expiresAt field
  // If timeLimit is 0, return null (unlimited time)
  const expirationTime = useMemo(() => {
    console.log('[QuizActivity] Calculating expiration time...', {
      hasCreatedAt: !!activity?.createdAt,
      createdAt: activity?.createdAt,
      hasTimeLimit: !!timeLimit,
      timeLimit,
      timeLimitPositive: timeLimit > 0,
      isUnlimited: timeLimit === 0,
    });

    // If timeLimit is 0, no timer (unlimited time)
    if (timeLimit === 0) {
      console.log('[QuizActivity] ⏰ Unlimited time - no timer');
      return null;
    }

    if (!activity?.createdAt || timeLimit <= 0) {
      console.log('[QuizActivity] ❌ Missing required data for timer:', {
        hasCreatedAt: !!activity?.createdAt,
        createdAt: activity?.createdAt,
        timeLimit,
      });
      return null;
    }

    // Parse the createdAt timestamp as UTC
    // Backend sends UTC timestamps without 'Z' suffix, so we need to add it
    let createdAtString = activity.createdAt;
    if (createdAtString && !createdAtString.endsWith('Z') && !createdAtString.includes('+')) {
      createdAtString = createdAtString + 'Z';
    }

    const createdDate = new Date(createdAtString);
    const createdTime = createdDate.getTime();

    // Check if date is valid
    if (isNaN(createdTime)) {
      console.error('[QuizActivity] ❌ Invalid createdAt date:', activity.createdAt);
      return null;
    }

    const expTime = createdTime + (timeLimit * 1000); // Convert seconds to milliseconds
    const now = Date.now();
    const remainingMs = expTime - now;
    const remainingSeconds = Math.floor(remainingMs / 1000);

    console.log('[QuizActivity] ✅ Timer calculation (UTC):', {
      createdAt: activity.createdAt,
      createdDate: createdDate.toISOString(),
      createdTime: createdTime,
      timeLimit: `${timeLimit} seconds (${Math.floor(timeLimit / 60)} minutes)`,
      expirationTime: expTime,
      expirationDate: new Date(expTime).toISOString(),
      currentTime: new Date(now).toISOString(),
      remainingMs: remainingMs,
      remainingSeconds: remainingSeconds,
      remainingFormatted: `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`,
      isExpired: remainingSeconds <= 0,
    });

    return expTime;
  }, [activity?.createdAt, timeLimit]);

  // Check if student has already submitted
  useEffect(() => {
    const checkExistingSubmission = async () => {
      if (!activity?.id || !studentState?.studentId) {
        console.log('[QuizActivity] Missing activity ID or student ID');
        setIsCheckingSubmission(false);
        return;
      }

      setIsCheckingSubmission(true);
      try {
        const response = await activityAPI.getStudentSubmission(
          activity.id,
          studentState.studentId
        );

        if (response.code === 0 && response.data && response.data.id) {
          console.log('[QuizActivity] Student has already submitted:', response.data);
          setHasSubmitted(true);
          setSubmissionResult(response.data);
        } else {
          setHasSubmitted(false);
          // Set start time when quiz is active and not yet submitted
          if (isActive && !startTimeRef.current) {
            startTimeRef.current = Date.now();
            console.log('[QuizActivity] ⏱️ Quiz started at:', new Date(startTimeRef.current).toISOString());
          }
        }
      } catch (err) {
        console.log('[QuizActivity] No existing submission found', err);
        setHasSubmitted(false);
        // Set start time when quiz is active and not yet submitted
        if (isActive && !startTimeRef.current) {
          startTimeRef.current = Date.now();
          console.log('[QuizActivity] ⏱️ Quiz started at:', new Date(startTimeRef.current).toISOString());
        }
      } finally {
        setIsCheckingSubmission(false);
      }
    };

    checkExistingSubmission();
  }, [activity?.id, studentState?.studentId, isActive]);

  // Timer logic - Calculate time remaining based on expiration time (UTC)
  useEffect(() => {
    console.log('[QuizActivity] Timer effect triggered:', {
      hasSubmitted,
      isActive,
      expirationTime,
      willStartTimer: !hasSubmitted && isActive && !!expirationTime,
    });

    if (hasSubmitted || !isActive || !expirationTime) {
      console.log('[QuizActivity] ❌ Timer not starting:', {
        hasSubmitted,
        isActive,
        expirationTime,
        reason: !expirationTime ? 'No expiration time' : hasSubmitted ? 'Already submitted' : 'Not active',
      });
      return undefined;
    }

    console.log('[QuizActivity] ⏰ Starting timer (UTC):', {
      expirationTime,
      expirationDate: new Date(expirationTime).toISOString(),
      currentTime: new Date().toISOString(),
      currentTimestamp: Date.now(),
    });

    // Calculate initial time remaining (UTC-based)
    const calculateTimeRemaining = () => {
      const now = Date.now(); // Current UTC time in milliseconds
      const remaining = Math.max(0, Math.floor((expirationTime - now) / 1000));
      return remaining;
    };

    const initialRemaining = calculateTimeRemaining();
    const minutes = Math.floor(initialRemaining / 60);
    const seconds = initialRemaining % 60;

    console.log('[QuizActivity] ⏱️ Initial time remaining:', {
      seconds: initialRemaining,
      formatted: `${minutes}:${String(seconds).padStart(2, '0')}`,
      isExpired: initialRemaining <= 0,
    });

    if (initialRemaining <= 0) {
      // Time already up
      console.log('[QuizActivity] ⚠️ Time already expired! Auto-submitting...');
      setTimeRemaining(0);
      setIsTimeUp(true);
      handleSubmit(true);
      return undefined;
    }

    setTimeRemaining(initialRemaining);
    console.log('[QuizActivity] ✅ Timer state set to:', initialRemaining);

    // Update timer every second based on actual expiration time
    timerRef.current = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        console.log('[QuizActivity] ⏰ Timer expired! Auto-submitting...');
        clearInterval(timerRef.current);
        setIsTimeUp(true);
        // Auto-submit when time is up
        handleSubmit(true);
      }
    }, 1000);

    console.log('[QuizActivity] ✅ Timer interval started');

    // Cleanup
    return () => {
      if (timerRef.current) {
        console.log('[QuizActivity] 🧹 Cleaning up timer');
        clearInterval(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSubmitted, isActive, expirationTime]);

  // Handle answer selection
  const handleAnswerSelect = useCallback((questionIndex, optionIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
    setError(null);
  }, []);

  // Submit quiz
  const handleSubmit = async (autoSubmit = false) => {
    // Validate all questions answered
    const totalQuestions = activity.questions?.length || 0;
    const answeredQuestions = Object.keys(answers).length;

    if (!autoSubmit && answeredQuestions < totalQuestions) {
      setError(`Please answer all ${totalQuestions} questions before submitting.`);
      return;
    }

    // Convert answers object to array
    const answersArray = [];
    for (let i = 0; i < totalQuestions; i += 1) {
      answersArray.push(answers[i] ?? -1); // -1 for unanswered
    }

    // Calculate actual time spent
    let timeSpent = 0;
    if (timeLimit > 0 && expirationTime) {
      // For timed quiz: time spent = timeLimit - remaining time
      timeSpent = timeLimit - (timeRemaining || 0);
    } else if (startTimeRef.current) {
      // For unlimited time quiz: calculate actual time spent from start
      const endTime = Date.now();
      timeSpent = Math.floor((endTime - startTimeRef.current) / 1000);
      console.log('[QuizActivity] ⏱️ Time spent calculation:', {
        startTime: new Date(startTimeRef.current).toISOString(),
        endTime: new Date(endTime).toISOString(),
        timeSpent: `${timeSpent} seconds (${Math.floor(timeSpent / 60)}:${String(timeSpent % 60).padStart(2, '0')})`,
      });
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await activityAPI.submitQuiz(activity.id, {
        studentId: studentState.studentId,
        answers: answersArray,
        timeSpent,
      });

      if (response.code === 0) {
        console.log('[QuizActivity] Submission successful:', response.data);
        setHasSubmitted(true);
        setSubmissionResult(response.data);

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        if (onSubmitSuccess) {
          onSubmitSuccess(response.data);
        }
      } else {
        setError(response.message || 'Failed to submit quiz');
      }
    } catch (err) {
      console.error('[QuizActivity] Submission error:', err);
      setError(err.message || 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  // Navigation handlers
  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Show loading while checking submission
  if (isCheckingSubmission) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading quiz...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // Check if quiz data is incomplete
  if (!activity.questions || activity.questions.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            <Typography variant="subtitle2" gutterBottom>
              Quiz data is incomplete
            </Typography>
            <Typography variant="body2">
              This quiz does not have any questions. Please contact your instructor.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show submitted state
  if (hasSubmitted && submissionResult) {
    const statusLabel = isHistoryView ? 'COMPLETED' : 'SUBMITTED';
    const statusColor = isHistoryView ? 'info' : 'success';
    const statusIcon = isHistoryView ? 'solar:history-bold' : 'solar:check-circle-bold';

    const score = submissionResult.score ?? submissionResult.quiz_Score ?? 0;
    const timeSpent = submissionResult.timeSpent ?? submissionResult.quiz_TimeSpent ?? 0;

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

            {/* Score Display */}
            <Card variant="outlined" sx={{ bgcolor: 'background.neutral', p: 3 }}>
              <Stack spacing={2} alignItems="center">
                <Iconify icon="solar:cup-star-bold" width={48} color="primary.main" />
                <Typography variant="h3" color="primary.main">
                  {score.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your Score
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">{totalQuestions}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Questions
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">{formatTime(timeSpent)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Time Spent
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Card>

            <Typography variant="caption" color="text.secondary" textAlign="center">
              {isHistoryView
                ? 'Historical quiz - Results are final'
                : 'Thank you for completing the quiz!'}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // Show quiz form
  const statusLabel = isHistoryView ? 'HISTORICAL' : isActive ? 'ACTIVE' : 'INACTIVE';
  const statusColor = isHistoryView ? 'info' : isActive ? 'success' : 'default';
  const statusIcon = isHistoryView
    ? 'solar:history-bold'
    : isActive
      ? 'solar:play-circle-bold'
      : 'solar:pause-circle-bold';

  // Debug timer display
  console.log('[QuizActivity] 🖥️ UI Render - Timer display check:', {
    timeLimit,
    timeRemaining,
    timeRemainingType: typeof timeRemaining,
    timeRemainingIsNull: timeRemaining === null,
    expirationTime,
    hasSubmitted,
    isActive,
    showTimer: timeRemaining !== null,
    timerValue: timeRemaining !== null ? formatTime(timeRemaining) : 'N/A',
  });

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5">{activity.title}</Typography>
            <Stack direction="row" spacing={1}>
              {/* Show timer chip only if there's a time limit */}
              {timeLimit > 0 && timeRemaining !== null && (
                <Chip
                  label={formatTime(timeRemaining)}
                  color={timeRemaining < 60 ? 'error' : 'default'}
                  icon={<Iconify icon="solar:clock-circle-bold" />}
                  variant="outlined"
                />
              )}
              {/* Show "Unlimited Time" chip if timeLimit is 0 */}
              {timeLimit === 0 && !hasSubmitted && (
                <Chip
                  label="Unlimited Time"
                  color="info"
                  icon={<Iconify icon="solar:infinity-bold" />}
                  variant="outlined"
                />
              )}
              <Chip label={statusLabel} color={statusColor} icon={<Iconify icon={statusIcon} />} />
            </Stack>
          </Stack>

          {activity.description && (
            <Typography variant="body2" color="text.secondary">
              {activity.description}
            </Typography>
          )}

          {/* Progress Bar */}
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progress: {answeredCount} / {totalQuestions} questions
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {progress.toFixed(0)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 1,
                },
              }}
            />
          </Box>

          {/* Time warning */}
          {isTimeUp && (
            <Alert severity="warning">
              Time is up! Submitting your answers...
            </Alert>
          )}

          {/* Current Question - Show one at a time */}
          <Stack spacing={2}>
            {/* Question indicator */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" color="text.secondary">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Iconify icon="solar:alt-arrow-left-bold" />}
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<Iconify icon="solar:alt-arrow-right-bold" />}
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                >
                  Next
                </Button>
              </Stack>
            </Stack>

            {/* Current question */}
            <QuizQuestion
              question={activity.questions[currentQuestionIndex]}
              questionIndex={currentQuestionIndex}
              selectedAnswer={answers[currentQuestionIndex]}
              onAnswerSelect={handleAnswerSelect}
              isSubmitted={hasSubmitted}
            />

            {/* Question navigation dots */}
            <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
              {activity.questions.map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: answers[index] !== undefined ? 'primary.main' : 'action.disabled',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: index === currentQuestionIndex ? 2 : 0,
                    borderColor: 'primary.dark',
                    '&:hover': {
                      transform: 'scale(1.3)',
                    },
                  }}
                  onClick={() => setCurrentQuestionIndex(index)}
                />
              ))}
            </Stack>
          </Stack>

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {/* Warning if not all questions answered */}
          {answeredCount < totalQuestions && (
            <Alert severity="info">
              Please answer all questions before submitting. ({answeredCount}/{totalQuestions} answered)
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || answeredCount < totalQuestions || isTimeUp}
            startIcon={<Iconify icon="solar:check-circle-bold" />}
          >
            {isSubmitting ? 'Submitting...' : `Submit Quiz (${answeredCount}/${totalQuestions})`}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Custom comparison function for React.memo
function arePropsEqual(prevProps, nextProps) {
  if (prevProps.activity?.id !== nextProps.activity?.id) {
    return false;
  }

  if (prevProps.isHistoryView !== nextProps.isHistoryView) {
    return false;
  }

  if (
    prevProps.activity?.title !== nextProps.activity?.title ||
    prevProps.activity?.description !== nextProps.activity?.description ||
    prevProps.activity?.isActive !== nextProps.activity?.isActive
  ) {
    return false;
  }

  return true;
}

// Export memoized version
export const QuizActivity = memo(QuizActivityComponent, arePropsEqual);
