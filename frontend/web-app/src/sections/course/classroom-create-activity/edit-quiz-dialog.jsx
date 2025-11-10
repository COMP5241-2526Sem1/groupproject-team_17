'use client';

import { useEffect, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function EditQuizDialog({ open, onClose, onSubmit, activity }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([
    {
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 1,
      explanation: '',
    },
  ]);
  const [timeLimit, setTimeLimit] = useState(300);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Load activity data when dialog opens
  useEffect(() => {
    if (open && activity) {
      console.log('[EditQuizDialog] Loading activity:', activity);
      setTitle(activity.title || '');
      setDescription(activity.description || '');
      setQuestions(
        activity.questions && activity.questions.length > 0
          ? activity.questions.map((q) => ({
            text: q.text || '',
            options: q.options || ['', '', '', ''],
            correctAnswer: q.correctAnswer || 0,
            points: q.points || 1,
            explanation: q.explanation || '',
          }))
          : [
            {
              text: '',
              options: ['', '', '', ''],
              correctAnswer: 0,
              points: 1,
              explanation: '',
            },
          ]
      );
      setTimeLimit(activity.timeLimit || 300);
      setCurrentQuestionIndex(0);
    }
  }, [open, activity]);

  // Navigation handlers
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Add a new question
  const handleAddQuestion = () => {
    const newQuestions = [
      ...questions,
      {
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 1,
        explanation: '',
      },
    ];
    setQuestions(newQuestions);
    setCurrentQuestionIndex(newQuestions.length - 1); // Navigate to new question
  };

  // Remove a question
  const handleRemoveQuestion = (index) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setQuestions(newQuestions);
      // Adjust current index if needed
      if (currentQuestionIndex >= newQuestions.length) {
        setCurrentQuestionIndex(newQuestions.length - 1);
      }
    }
  };

  // Update question text
  const handleQuestionTextChange = (questionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].text = value;
    setQuestions(newQuestions);
  };

  // Update question option
  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };

  // Add option to question
  const handleAddOption = (questionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.push('');
    setQuestions(newQuestions);
  };

  // Remove option from question
  const handleRemoveOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length > 2) {
      newQuestions[questionIndex].options.splice(optionIndex, 1);
      // Adjust correct answer if needed
      if (newQuestions[questionIndex].correctAnswer >= newQuestions[questionIndex].options.length) {
        newQuestions[questionIndex].correctAnswer = newQuestions[questionIndex].options.length - 1;
      }
      setQuestions(newQuestions);
    }
  };

  // Update correct answer
  const handleCorrectAnswerChange = (questionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].correctAnswer = parseInt(value, 10);
    setQuestions(newQuestions);
  };

  // Update points
  const handlePointsChange = (questionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].points = Math.max(1, parseInt(value, 10) || 1);
    setQuestions(newQuestions);
  };

  // Update explanation
  const handleExplanationChange = (questionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].explanation = value;
    setQuestions(newQuestions);
  };

  // Validate form
  const validateForm = () => {
    if (!title.trim()) {
      setError('Quiz title is required');
      return false;
    }

    if (questions.length === 0) {
      setError('At least one question is required');
      return false;
    }

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      if (!q.text.trim()) {
        setError(`Question ${i + 1} text is required`);
        return false;
      }
      const validOptions = q.options.filter((opt) => opt.trim());
      if (validOptions.length < 2) {
        setError(`Question ${i + 1} must have at least 2 options`);
        return false;
      }
      if (q.correctAnswer >= validOptions.length) {
        setError(`Question ${i + 1} has invalid correct answer`);
        return false;
      }
    }

    setError('');
    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const validQuestions = questions.map((q) => ({
        text: q.text.trim(),
        options: q.options.filter((opt) => opt.trim()).map((opt) => opt.trim()),
        correctAnswer: q.correctAnswer,
        points: q.points,
        explanation: q.explanation?.trim() || null,
      }));

      const quizData = {
        title: title.trim(),
        description: description.trim(),
        questions: validQuestions,
        timeLimit,
      };

      await onSubmit(quizData);
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to update quiz');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset and close dialog
  const handleClose = () => {
    setError('');
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:document-text-bold" width={24} />
          <Typography variant="h6">Edit Quiz</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Quiz Title */}
          <TextField
            label="Quiz Title"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Chapter 1 Knowledge Check"
          />

          {/* Quiz Description */}
          <TextField
            label="Description (Optional)"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any additional context or instructions..."
          />

          {/* Quiz Questions */}
          <Box>
            {/* Navigation Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                Question {currentQuestionIndex + 1} of {questions.length}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  startIcon={<Iconify icon="solar:arrow-left-bold" />}
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  endIcon={<Iconify icon="solar:arrow-right-bold" />}
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Iconify icon="solar:add-circle-bold" />}
                  onClick={handleAddQuestion}
                >
                  Add Question
                </Button>
                <IconButton
                  color="error"
                  size="small"
                  onClick={() => handleRemoveQuestion(currentQuestionIndex)}
                  disabled={questions.length <= 1}
                  title="Delete this question"
                >
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Stack>
            </Stack>

            {/* Current Question */}
            {questions.length > 0 && currentQuestionIndex < questions.length && (
              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.neutral',
                }}
              >
                <Stack spacing={2}>
                  {/* Question Text */}
                  <TextField
                    label="Question Text"
                    fullWidth
                    required
                    multiline
                    rows={2}
                    value={questions[currentQuestionIndex].text}
                    onChange={(e) => handleQuestionTextChange(currentQuestionIndex, e.target.value)}
                    placeholder="Enter your question here..."
                  />

                  {/* Question Options */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                      Answer Options (minimum 2 required)
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {questions[currentQuestionIndex].options.map((option, oIndex) => (
                        <Stack key={oIndex} direction="row" spacing={1} alignItems="center">
                          <TextField
                            label={`Option ${oIndex + 1}`}
                            fullWidth
                            required
                            size="small"
                            value={option}
                            onChange={(e) =>
                              handleOptionChange(currentQuestionIndex, oIndex, e.target.value)
                            }
                            placeholder={`Enter option ${oIndex + 1}`}
                          />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleRemoveOption(currentQuestionIndex, oIndex)}
                            disabled={questions[currentQuestionIndex].options.length <= 2}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                          </IconButton>
                        </Stack>
                      ))}
                    </Stack>
                    <Button
                      size="small"
                      startIcon={<Iconify icon="solar:add-circle-bold" />}
                      onClick={() => handleAddOption(currentQuestionIndex)}
                      sx={{ mt: 1 }}
                    >
                      Add Option
                    </Button>
                  </Box>

                  {/* Correct Answer & Points */}
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Correct Answer"
                      select
                      fullWidth
                      size="small"
                      value={questions[currentQuestionIndex].correctAnswer}
                      onChange={(e) => handleCorrectAnswerChange(currentQuestionIndex, e.target.value)}
                    >
                      {questions[currentQuestionIndex].options.map((_, index) => (
                        <MenuItem key={index} value={index}>
                          Option {index + 1}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Points"
                      type="number"
                      size="small"
                      sx={{ width: 120 }}
                      value={questions[currentQuestionIndex].points}
                      onChange={(e) => handlePointsChange(currentQuestionIndex, e.target.value)}
                      inputProps={{ min: 1 }}
                    />
                  </Stack>

                  {/* Explanation */}
                  <TextField
                    label="Explanation (Optional)"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    value={questions[currentQuestionIndex].explanation}
                    onChange={(e) => handleExplanationChange(currentQuestionIndex, e.target.value)}
                    placeholder="Explain the correct answer..."
                  />
                </Stack>
              </Box>
            )}

            {/* Question Dots Indicator */}
            {questions.length > 1 && (
              <Stack direction="row" justifyContent="center" spacing={0.5} sx={{ mt: 2 }}>
                {questions.map((_, index) => (
                  <Box
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: index === currentQuestionIndex ? 'primary.main' : 'grey.300',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.2)',
                      },
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>

          {/* Quiz Settings */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Quiz Settings
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Time Limit (seconds)"
                type="number"
                fullWidth
                value={timeLimit}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (value === 0) {
                    setTimeLimit(0); // 0 = unlimited time
                  } else {
                    setTimeLimit(Math.max(60, value || 300));
                  }
                }}
                inputProps={{ min: 0 }}
                helperText="Set to 0 for unlimited time, or minimum 60 seconds (1 minute)"
              />
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={
            submitting ? (
              <Iconify icon="svg-spinners:8-dots-rotate" />
            ) : (
              <Iconify icon="solar:check-circle-bold" />
            )
          }
        >
          {submitting ? 'Updating...' : 'Update Quiz'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
