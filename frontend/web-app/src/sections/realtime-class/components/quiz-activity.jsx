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
  const [isCheckingSubmission, setIsCheckingSubmission] = useState(true); // Start as true to block timer until check completes
  const [submissionResult, setSubmissionResult] = useState(null);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null); // Track when student started the quiz
  const isSubmittingRef = useRef(false); // Track submission state to prevent double submission
  const hasCheckedSubmissionRef = useRef(false); // Track if we've checked submission for current activity

  const isActive = activity.isActive && !isHistoryView;
  const timeLimit = activity.timeLimit || 0;
  const totalQuestions = activity.questions?.length || 0;

  // Debug: Log activity data when it changes
  console.log('[QuizActivity] Activity data:', {
    id: activity.id,
    title: activity.title,
    isActive: activity.isActive,
    isHistoryView,
    startedAt: activity.startedAt,
    timeLimit,
    hasStartedAt: !!activity.startedAt,
    startedAtType: typeof activity.startedAt,
    timeLimitType: typeof timeLimit,
  });

  // CRITICAL: Reset ALL state when activity changes (switching between activities)
  // This must run BEFORE checkExistingSubmission to prevent old answers from showing
  useEffect(() => {
    console.log('[QuizActivity] 🔄 Activity changed - resetting state for activity:', activity.id);
    setAnswers({});
    setSubmissionResult(null);
    setHasSubmitted(false);
    setError(null);
    setIsTimeUp(false);
    setCurrentQuestionIndex(0);
    startTimeRef.current = null;
    isSubmittingRef.current = false;
    hasCheckedSubmissionRef.current = false;

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [activity.id]); // Only trigger when activity ID changes

  // Calculate expiration time based on activity's startedAt (quiz_StartedAt) + timeLimit
  // Backend sends UTC timestamps when quiz is first activated by instructor
  // Note: We ONLY use startedAt + timeLimit, ignoring expiresAt field
  // If timeLimit is 0 or quiz not started yet, return null (unlimited time or not started)
  const expirationTime = useMemo(() => {
    console.log('[QuizActivity] Calculating expiration time...', {
      hasStartedAt: !!activity?.startedAt,
      startedAt: activity?.startedAt,
      hasTimeLimit: !!timeLimit,
      timeLimit,
      timeLimitPositive: timeLimit > 0,
    });

    // If quiz hasn't been started by instructor yet, no timer
    if (!activity?.startedAt) {
      console.log('[QuizActivity] ⏰ Quiz not started yet - waiting for instructor to activate');
      return null;
    }

    if (timeLimit <= 0) {
      console.log('[QuizActivity] ❌ Missing required data for timer:', {
        hasStartedAt: !!activity?.startedAt,
        startedAt: activity?.startedAt,
        timeLimit,
      });
      return null;
    }

    // Parse the startedAt timestamp as UTC
    // Backend sends UTC timestamps without 'Z' suffix, so we need to add it
    let startedAtString = activity.startedAt;
    if (startedAtString && !startedAtString.endsWith('Z') && !startedAtString.includes('+')) {
      startedAtString = startedAtString + 'Z';
    }

    const startedDate = new Date(startedAtString);
    const startedTime = startedDate.getTime();

    // Check if date is valid
    if (isNaN(startedTime)) {
      console.error('[QuizActivity] ❌ Invalid startedAt date:', activity.startedAt);
      return null;
    }

    const expTime = startedTime + (timeLimit * 1000); // Convert seconds to milliseconds
    const now = Date.now();
    const remainingMs = expTime - now;
    const remainingSeconds = Math.floor(remainingMs / 1000);

    console.log('[QuizActivity] ✅ Timer calculation (UTC):', {
      startedAt: activity.startedAt,
      startedDate: startedDate.toISOString(),
      startedTime: startedTime,
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
  }, [activity?.startedAt, timeLimit]);

  // Check if student has already submitted
  useEffect(() => {
    const checkExistingSubmission = async () => {
      if (!activity?.id || !studentState?.studentId) {
        console.log('[QuizActivity] Missing activity ID or student ID');
        setIsCheckingSubmission(false);
        hasCheckedSubmissionRef.current = true;
        return;
      }

      // Mark as checking and reset flag
      console.log('[QuizActivity] 🔍 Checking submission status for activity:', activity.id);
      setIsCheckingSubmission(true);
      hasCheckedSubmissionRef.current = false;

      try {
        const response = await activityAPI.getStudentSubmission(
          activity.id,
          studentState.studentId
        );

        if (response.code === 0 && response.data && response.data.id) {
          console.log('[QuizActivity] ✅ Found existing submission:', response.data);

          // Load saved answers from submission
          const savedAnswers = response.data.answers || [];
          const loadedAnswers = {};
          savedAnswers.forEach((answer, index) => {
            if (answer !== -1) { // -1 means unanswered
              loadedAnswers[index] = answer;
            }
          });

          console.log('[QuizActivity] 📥 Loading saved answers:', loadedAnswers);
          setAnswers(loadedAnswers);

          // Check if time has expired
          const isTimeExpired = expirationTime && Date.now() >= expirationTime;

          console.log('[QuizActivity] ⏰ Time expiration check:', {
            expirationTime: expirationTime ? new Date(expirationTime).toISOString() : null,
            now: new Date().toISOString(),
            isTimeExpired,
          });

          if (isTimeExpired) {
            // Time expired - show results with the submission
            console.log('[QuizActivity] ⏰ Time expired - showing results');
            setSubmissionResult(response.data);
            setHasSubmitted(true);
            setIsTimeUp(true);
          } else {
            // Time not expired yet - allow continuing
            console.log('[QuizActivity] ⏱️ Time not expired - allowing edits');
            setHasSubmitted(false);
            setSubmissionResult(null);
          }
        } else {
          console.log('[QuizActivity] ℹ️ No submission found - starting fresh');
          setAnswers({});
          setHasSubmitted(false);
          setSubmissionResult(null);
          // Set start time when quiz is active and not yet submitted
          if (isActive && !startTimeRef.current) {
            startTimeRef.current = Date.now();
            console.log('[QuizActivity] ⏱️ Quiz started at:', new Date(startTimeRef.current).toISOString());
          }
        }
      } catch (err) {
        console.log('[QuizActivity] ℹ️ No existing submission found', err);
        setAnswers({});
        setHasSubmitted(false);
        setSubmissionResult(null);
        // Set start time when quiz is active and not yet submitted
        if (isActive && !startTimeRef.current) {
          startTimeRef.current = Date.now();
          console.log('[QuizActivity] ⏱️ Quiz started at:', new Date(startTimeRef.current).toISOString());
        }
      } finally {
        console.log('[QuizActivity] ✅ Submission check completed');
        setIsCheckingSubmission(false);
        hasCheckedSubmissionRef.current = true;
      }
    };

    checkExistingSubmission();
  }, [activity?.id, studentState?.studentId, isActive]);

  // Timer logic - Calculate time remaining based on expiration time (UTC)
  useEffect(() => {
    console.log('[QuizActivity] 🕐 Timer effect triggered:', {
      hasSubmitted,
      isActive,
      expirationTime,
      isCheckingSubmission,
      hasCheckedSubmission: hasCheckedSubmissionRef.current,
      willStartTimer: !hasSubmitted && isActive && !!expirationTime && !isCheckingSubmission && hasCheckedSubmissionRef.current,
    });

    // Wait for submission check to complete before starting timer
    if (isCheckingSubmission || !hasCheckedSubmissionRef.current) {
      console.log('[QuizActivity] ⏳ Waiting for submission check to complete...', {
        isCheckingSubmission,
        hasCheckedSubmission: hasCheckedSubmissionRef.current,
      });
      return undefined;
    }

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

    // Function to fetch existing submission (defined once, used by both paths)
    const fetchSubmissionResult = async () => {
      console.log('[QuizActivity] 🔍 Fetching submission result on timer expiry...');
      try {
        const response = await activityAPI.getStudentSubmission(activity.id, studentState.studentId);
        console.log('[QuizActivity] 📥 Submission fetch response:', {
          code: response.code,
          hasData: !!response.data,
          data: response.data,
        });

        if (response.code === 0 && response.data) {
          console.log('[QuizActivity] ✅ Fetched auto-saved submission, setting submissionResult state');
          setSubmissionResult(response.data);
          setHasSubmitted(true); // Mark as submitted to ensure results display
        } else {
          console.log('[QuizActivity] ⚠️ No submission found - student did not answer any questions');
          // Don't submit anything - just let the "not submitted" message show
        }
      } catch (err) {
        console.error('[QuizActivity] ❌ Error fetching submission:', err);
        // Don't submit on error - show "not submitted" message
      }
    };

    if (initialRemaining <= 0) {
      // Time already up - fetch auto-saved submission
      console.log('[QuizActivity] ⚠️ Time already expired! Fetching auto-saved submission...');
      setTimeRemaining(0);
      setIsTimeUp(true);
      fetchSubmissionResult();
      return undefined;
    }

    setTimeRemaining(initialRemaining);
    console.log('[QuizActivity] ✅ Timer state set to:', initialRemaining);

    // Update timer every second based on actual expiration time
    timerRef.current = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        console.log('[QuizActivity] ⏰ Timer expired! Fetching auto-saved submission...');
        clearInterval(timerRef.current);
        setIsTimeUp(true);

        // Fetch the auto-saved submission to display results
        fetchSubmissionResult();
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
  }, [hasSubmitted, isActive, expirationTime, isCheckingSubmission]);

  // Auto-save function - saves answers without marking as "submitted"
  const autoSaveAnswers = useCallback(async (currentAnswers) => {
    if (!activity?.id || !studentState?.studentId || hasSubmitted) {
      console.log('[QuizActivity] ⚠️ Auto-save skipped:', {
        hasActivityId: !!activity?.id,
        activityId: activity?.id,
        hasStudentId: !!studentState?.studentId,
        studentId: studentState?.studentId,
        hasSubmitted,
      });
      return;
    }

    console.log('[QuizActivity] 💾 Auto-saving answers:', {
      activityId: activity.id,
      activityTitle: activity.title,
      studentId: studentState.studentId,
      currentAnswers,
    });

    try {
      const totalQuestions = activity.questions?.length || 0;
      const answersArray = [];
      for (let i = 0; i < totalQuestions; i += 1) {
        answersArray.push(currentAnswers[i] ?? -1);
      }

      // Calculate time spent
      let timeSpent = 0;
      if (startTimeRef.current) {
        timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
        timeSpent = Math.max(0, timeSpent);
        if (timeLimit > 0) {
          timeSpent = Math.min(timeSpent, timeLimit);
        }
      }

      console.log('[QuizActivity] 📤 Submitting to API:', {
        activityId: activity.id,
        studentId: studentState.studentId,
        answersArray,
        timeSpent,
      });

      await activityAPI.submitQuiz(activity.id, {
        studentId: studentState.studentId,
        answers: answersArray,
        timeSpent,
      });

      console.log('[QuizActivity] ✅ Auto-save successful for activity:', activity.id);
    } catch (err) {
      console.log('[QuizActivity] ⚠️ Auto-save failed (this is OK):', err.message);
      // Don't show error to user for auto-save failures
    }
  }, [activity, studentState, hasSubmitted, timeLimit]);

  // Handle answer selection - auto-save after each answer
  const handleAnswerSelect = useCallback((questionIndex, optionIndex) => {
    console.log('[QuizActivity] 📝 Answer selected:', {
      questionIndex,
      optionIndex,
      currentActivityId: activity?.id,
      currentActivityTitle: activity?.title,
    });

    setAnswers((prev) => {
      const newAnswers = {
        ...prev,
        [questionIndex]: optionIndex,
      };

      // Auto-save the current answers after state update
      setTimeout(() => {
        autoSaveAnswers(newAnswers);
      }, 0);

      return newAnswers;
    });
    setError(null);
  }, [activity, autoSaveAnswers]);

  // Submit quiz
  const handleSubmit = async (autoSubmit = false) => {
    console.log('[QuizActivity] 📤 handleSubmit called:', {
      autoSubmit,
      hasSubmitted,
      isSubmitting,
      isSubmittingRef: isSubmittingRef.current,
      answersCount: Object.keys(answers).length,
      answers,
    });

    // Prevent double submission using both state and ref
    if (hasSubmitted || isSubmitting || isSubmittingRef.current) {
      console.log('[QuizActivity] ⚠️ Submission blocked - already submitted or in progress');
      return;
    }

    // Mark as submitting immediately
    isSubmittingRef.current = true;

    // Validate all questions answered
    const totalQuestions = activity.questions?.length || 0;
    const answeredQuestions = Object.keys(answers).length;

    if (!autoSubmit && answeredQuestions < totalQuestions) {
      setError(`Please answer all ${totalQuestions} questions before submitting.`);
      return;
    }

    console.log('[QuizActivity] ✅ Proceeding with submission:', {
      totalQuestions,
      answeredQuestions,
      autoSubmit,
    });

    // Convert answers object to array
    const answersArray = [];
    for (let i = 0; i < totalQuestions; i += 1) {
      answersArray.push(answers[i] ?? -1); // -1 for unanswered
    }

    // Calculate actual time spent
    let timeSpent = 0;
    const endTime = Date.now();

    if (startTimeRef.current) {
      // Calculate actual time spent from when student started the quiz
      timeSpent = Math.floor((endTime - startTimeRef.current) / 1000);
      console.log('[QuizActivity] ⏱️ Time spent calculation:', {
        startTime: new Date(startTimeRef.current).toISOString(),
        endTime: new Date(endTime).toISOString(),
        elapsedMs: endTime - startTimeRef.current,
        timeSpent: `${timeSpent} seconds (${Math.floor(timeSpent / 60)}:${String(timeSpent % 60).padStart(2, '0')})`,
        timeLimit: timeLimit > 0 ? `${timeLimit}s` : 'unlimited',
      });

      // Ensure time spent is not negative and not exceeding reasonable limits
      timeSpent = Math.max(0, timeSpent);

      // If there's a time limit and time spent exceeds it, cap at time limit
      if (timeLimit > 0) {
        timeSpent = Math.min(timeSpent, timeLimit);
      }
    } else {
      console.warn('[QuizActivity] ⚠️ No start time recorded, using fallback calculation');
      // Fallback: if we have timeLimit and timeRemaining, calculate from that
      if (timeLimit > 0 && timeRemaining !== null) {
        timeSpent = Math.max(0, timeLimit - timeRemaining);
      }
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
        console.log('[QuizActivity] ✅ Submission successful:', response.data);
        setHasSubmitted(true);
        setSubmissionResult(response.data);
        setIsTimeUp(false); // Reset time up flag

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        if (onSubmitSuccess) {
          onSubmitSuccess(response.data);
        }
      } else {
        console.error('[QuizActivity] ❌ Submission failed:', response.message);
        setError(response.message || 'Failed to submit quiz');
        setIsTimeUp(false); // Reset time up flag to allow retry
        isSubmittingRef.current = false; // Reset ref on failure to allow retry
      }
    } catch (err) {
      console.error('[QuizActivity] ❌ Submission error:', err);
      setError(err.message || 'Failed to submit quiz');
      setIsTimeUp(false); // Reset time up flag to allow retry
      isSubmittingRef.current = false; // Reset ref on error to allow retry
    } finally {
      setIsSubmitting(false);
      console.log('[QuizActivity] 🏁 Submission process completed');
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    // Ensure we never display negative time
    const safeSeconds = Math.max(0, seconds);
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
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

  // Determine if quiz is completed based on time or activity status
  const isQuizExpired = expirationTime && Date.now() >= expirationTime;

  // Only show results if:
  // 1. Historical view OR
  // 2. Activity is inactive OR
  // 3. Time is up (expired or isTimeUp)
  // NOTE: Must check time FIRST before showing results, even if we have submissionResult from auto-save
  const isQuizCompleted = isHistoryView || !isActive || isQuizExpired || isTimeUp;

  console.log('[QuizActivity] 📊 Result display check:', {
    isQuizCompleted,
    isHistoryView,
    isActive,
    isQuizExpired,
    isTimeUp,
    hasSubmissionResult: !!submissionResult,
    submissionResult,
    expirationTime: expirationTime ? new Date(expirationTime).toISOString() : null,
    now: new Date().toISOString(),
    shouldShowResults: isQuizCompleted && !!submissionResult,
  });

  // If quiz is completed but no submission exists, show "not submitted" message
  if (isQuizCompleted && !submissionResult) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h5">{activity.title}</Typography>
              <Chip
                label="TIME'S UP"
                color="error"
                icon={<Iconify icon="solar:clock-circle-bold" />}
              />
            </Stack>

            {activity.description && (
              <Typography variant="body2" color="text.secondary">
                {activity.description}
              </Typography>
            )}

            {/* No submission message */}
            <Alert severity="warning" icon={<Iconify icon="solar:info-circle-bold" />}>
              <Typography variant="subtitle2" gutterBottom>
                You have not submitted any answers
              </Typography>
              <Typography variant="body2">
                The quiz time has expired and no answers were recorded.
              </Typography>
            </Alert>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // Show results state ONLY if quiz is completed AND we have submission data
  // This prevents showing results when refreshing with auto-saved partial answers
  if (isQuizCompleted && submissionResult) {
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
                    <Typography variant="body1" fontWeight="medium">
                      {new Date(submissionResult.submittedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(submissionResult.submittedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                      })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Submitted At
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
              {timeRemaining !== null && (
                <Chip
                  label={formatTime(timeRemaining)}
                  color={timeRemaining < 60 ? 'error' : 'default'}
                  icon={<Iconify icon="solar:clock-circle-bold" />}
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

          {/* Auto-save info */}
          <Alert severity="info" icon={<Iconify icon="solar:cloud-check-bold" />}>
            Your answers are automatically saved as you select them. ({answeredCount}/{totalQuestions} answered)
          </Alert>
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
