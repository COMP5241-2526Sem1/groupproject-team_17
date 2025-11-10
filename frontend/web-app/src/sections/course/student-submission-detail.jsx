'use client';

import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { Iconify } from 'src/components/iconify';

export default function StudentSubmissionDetail({ submission, activity, onBack }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Ensure UTC string is properly parsed and converted to local time
    const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const getActivityType = () => {
    const normalizedType = typeof activity.type === 'number'
      ? (activity.type === 1 ? 'quiz' : activity.type === 2 ? 'poll' : 'discussion')
      : activity.type?.toLowerCase();
    return normalizedType;
  };

  const activityType = getActivityType();

  const renderQuizAnswers = () => {
    if (!submission.answers || !activity.questions) {
      return (
        <Box>
          <Typography variant="body2" color="error">
            Unable to load quiz questions. Please try refreshing.
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Quiz Answers
        </Typography>
        {activity.questions.map((question, index) => {
          const studentAnswer = submission.answers[index];
          const isCorrect = studentAnswer === question.correctAnswer;

          return (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  <Chip
                    label={`Q${index + 1}`}
                    color="primary"
                    size="small"
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {question.text || question.question}
                    </Typography>
                    <List dense>
                      {question.options.map((option, optIndex) => {
                        const isStudentAnswer = studentAnswer === optIndex;
                        const isCorrectAnswer = question.correctAnswer === optIndex;
                        // Handle both string and object options
                        const optionText = typeof option === 'string' ? option : option?.text || 'Option ' + (optIndex + 1);
                        // Get option letter (A, B, C, D, ...)
                        const optionLetter = String.fromCharCode(65 + optIndex); // 65 is ASCII for 'A'

                        return (
                          <ListItem
                            key={optIndex}
                            sx={{
                              bgcolor: isStudentAnswer
                                ? isCorrect
                                  ? 'success.lighter'
                                  : 'error.lighter'
                                : isCorrectAnswer
                                  ? 'success.lighter'
                                  : 'transparent',
                              borderRadius: 1,
                              mb: 0.5,
                            }}
                          >
                            <ListItemText
                              primary={
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '24px' }}>
                                    {optionLetter}.
                                  </Typography>
                                  <Typography variant="body2">{optionText}</Typography>
                                  {isStudentAnswer && (
                                    <Chip
                                      label="Student Answer"
                                      size="small"
                                      color={isCorrect ? 'success' : 'error'}
                                    />
                                  )}
                                  {isCorrectAnswer && !isStudentAnswer && (
                                    <Chip
                                      label="Correct Answer"
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                    />
                                  )}
                                </Stack>
                              }
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}

        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Score
                </Typography>
                <Typography variant="h4" color={
                  submission.score >= 80 ? 'success.main' :
                    submission.score >= 60 ? 'warning.main' : 'error.main'
                }>
                  {submission.score?.toFixed(1) || 0}%
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Time Spent
                </Typography>
                <Typography variant="h4">
                  {Math.floor((submission.timeSpent || 0) / 60)}m {(submission.timeSpent || 0) % 60}s
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Correct Answers
                </Typography>
                <Typography variant="h4">
                  {submission.answers?.filter((ans, idx) =>
                    ans === activity.questions?.[idx]?.correctAnswer
                  ).length || 0} / {activity.questions?.length || 0}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  };

  const renderPollAnswers = () => {
    if (!submission.selectedOptions || !activity.options) return null;

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Poll Answers
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2 }}>
              {activity.title}
            </Typography>

            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Selected Options:
            </Typography>
            <List>
              {activity.options.map((option, index) => {
                const isSelected = submission.selectedOptions.includes(index);
                // Handle both string and object options
                const optionText = typeof option === 'string' ? option : option?.text || 'Option ' + (index + 1);

                return (
                  <ListItem
                    key={index}
                    sx={{
                      bgcolor: isSelected ? 'primary.lighter' : 'transparent',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {isSelected && (
                            <Iconify icon="eva:checkmark-circle-2-fill" color="primary.main" />
                          )}
                          <Typography variant="body2">{optionText}</Typography>
                        </Stack>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>
      </Box>
    );
  };

  const renderDiscussionAnswer = () => {
    if (!submission.text) return null;

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Discussion Response
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ whiteSpace: 'pre-wrap' }}>
              {activity.title}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {submission.text}
            </Typography>


          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={onBack}>
          <Iconify icon="eva:arrow-back-fill" />
        </IconButton>
        <Box>
          <Typography variant="h6">Submission Detail</Typography>
          <Typography variant="caption" color="text.secondary">
            {activity.title}
          </Typography>
        </Box>
      </Stack>

      {/* Student Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Student Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Student ID
              </Typography>
              <Typography variant="body2">
                {submission.student?.studentId || submission.studentId}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Full Name
              </Typography>
              <Typography variant="body2">
                {submission.student?.fullName ||
                  `${submission.student?.firstName || ''} ${submission.student?.lastName || ''}`.trim() ||
                  'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body2">
                {submission.student?.email || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Submitted At
              </Typography>
              <Typography variant="body2">
                {formatDate(submission.submittedAt)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Submission Content */}
      {activityType === 'quiz' && renderQuizAnswers()}
      {(activityType === 'poll' || activityType === 'polling') && renderPollAnswers()}
      {activityType === 'discussion' && renderDiscussionAnswer()}
    </Box>
  );
}
