'use client';

import { useEffect, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';

import { useSelector } from 'src/redux/hooks';

import { Iconify } from 'src/components/iconify';

import { activityAPI } from 'src/api/api-function-call';

export default function CourseDetailsLeaderboard() {
  const { selectedCourse } = useSelector((state) => state.classManagement);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [totalActivities, setTotalActivities] = useState(0);

  const fetchLeaderboardData = async () => {
    if (!selectedCourse?.id) return;

    try {
      setLoading(true);
      setError(null);

        // 1. Get all activities for the course
        const activitiesResponse = await activityAPI.getCourseActivities(selectedCourse.id, false);
        if (activitiesResponse.code !== 0 || !activitiesResponse.data) {
          throw new Error('Failed to fetch activities');
        }

        const activities = activitiesResponse.data;
        setTotalActivities(activities.length);

        // 2. Get all students
        const students = selectedCourse.students || [];

        // 3. For each student, calculate completion and quiz scores
        const leaderboardPromises = students.map(async (student) => {
          let completedActivities = 0;
          let totalQuizScore = 0;
          let maxQuizScore = 0;

          // Check submissions for each activity
          for (const activity of activities) {
            try {
              const submissionsResponse = await activityAPI.getActivitySubmissions(activity.id);
              if (submissionsResponse.code === 0 && submissionsResponse.data) {
                const studentSubmission = submissionsResponse.data.find(
                  (sub) => sub.studentId === student.studentId
                );

                if (studentSubmission) {
                  completedActivities += 1;

                  // If it's a quiz (type === 1), calculate score
                  if (activity.type === 1) {
                    const questions = activity.questions || activity.Questions || [];
                    const answers = studentSubmission.answers || [];

                    let correctAnswers = 0;
                    questions.forEach((question, index) => {
                      if (answers[index] === question.correctAnswer) {
                        correctAnswers += question.points || 1;
                      }
                    });

                    totalQuizScore += correctAnswers;
                    maxQuizScore += questions.reduce((sum, q) => sum + (q.points || 1), 0);
                  }
                }
              }
            } catch (err) {
              console.error(`Error fetching submissions for activity ${activity.id}:`, err);
            }
          }

          return {
            studentId: student.studentId || student.id,
            studentName: student.fullname || student.name || student.studentName || 'Unknown',
            email: student.email || '',
            completedActivities,
            completionRate:
              totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0,
            totalQuizScore,
            maxQuizScore,
            quizScorePercentage: maxQuizScore > 0 ? (totalQuizScore / maxQuizScore) * 100 : 0,
          };
        });

        const results = await Promise.all(leaderboardPromises);

        // Sort by completion rate (descending), then by quiz score (descending)
        results.sort((a, b) => {
          if (b.completionRate !== a.completionRate) {
            return b.completionRate - a.completionRate;
          }
          return b.totalQuizScore - a.totalQuizScore;
        });

        setLeaderboardData(results);
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchLeaderboardData();
  }, [selectedCourse]);

  const handleRefresh = () => {
    fetchLeaderboardData();
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Rank', 'Student ID', 'Completed Activities', 'Total Activities', 'Completion Rate (%)', 'Quiz Score', 'Max Quiz Score', 'Quiz Score (%)'];
    const rows = leaderboardData.map((student, index) => [
      index + 1,
      student.studentId,
      student.completedActivities,
      totalActivities,
      Math.round(student.completionRate),
      student.totalQuizScore,
      student.maxQuizScore,
      Math.round(student.quizScorePercentage)
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `leaderboard_${selectedCourse?.courseCode || 'course'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Student Leaderboard"
        subheader={`Based on ${totalActivities} total activities`}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:download-bold" />}
              onClick={handleExportCSV}
              disabled={loading || leaderboardData.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:refresh-bold" />}
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
        }
      />
      <CardContent>
        {leaderboardData.length === 0 ? (
          <Alert severity="info">No student data available</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell align="center">Completion</TableCell>
                  <TableCell align="center">Quiz Score</TableCell>
                  <TableCell align="center">Overall Progress</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderboardData.map((student, index) => (
                  <TableRow key={student.studentId} hover>
                    {/* Rank */}
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {index === 0 && (
                          <Iconify icon="eva:trophy-fill" sx={{ color: 'warning.main' }} />
                        )}
                        {index === 1 && (
                          <Iconify icon="eva:trophy-fill" sx={{ color: 'grey.500' }} />
                        )}
                        {index === 2 && (
                          <Iconify icon="eva:trophy-fill" sx={{ color: '#CD7F32' }} />
                        )}
                        <Typography variant="h6">#{index + 1}</Typography>
                      </Stack>
                    </TableCell>

                    {/* Student Info */}
                    <TableCell>
                      <Typography variant="subtitle2">{student.studentId}</Typography>
                    </TableCell>

                    {/* Completion */}
                    <TableCell align="center">
                      <Stack spacing={0.5} alignItems="center">
                        <Typography variant="body2" fontWeight="medium">
                          {student.completedActivities}/{totalActivities}
                        </Typography>
                        <Box sx={{ width: 100 }}>
                          <LinearProgress
                            variant="determinate"
                            value={student.completionRate}
                            sx={{
                              height: 6,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(student.completionRate)}%
                        </Typography>
                      </Stack>
                    </TableCell>

                    {/* Quiz Score */}
                    <TableCell align="center">
                      <Stack spacing={0.5} alignItems="center">
                        <Typography variant="body2" fontWeight="medium">
                          {student.totalQuizScore}/{student.maxQuizScore}
                        </Typography>
                        {student.maxQuizScore > 0 && (
                          <>
                            <Box sx={{ width: 100 }}>
                              <LinearProgress
                                variant="determinate"
                                value={student.quizScorePercentage}
                                color="success"
                                sx={{
                                  height: 6,
                                  borderRadius: 1,
                                  bgcolor: 'action.hover',
                                }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {Math.round(student.quizScorePercentage)}%
                            </Typography>
                          </>
                        )}
                        {student.maxQuizScore === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            No quizzes
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    {/* Overall Progress */}
                    <TableCell align="center">
                      <Chip
                        label={
                          student.completionRate === 100
                            ? 'Complete'
                            : student.completionRate >= 75
                              ? 'Excellent'
                              : student.completionRate >= 50
                                ? 'Good'
                                : student.completionRate >= 25
                                  ? 'Fair'
                                  : 'Needs Improvement'
                        }
                        size="small"
                        color={
                          student.completionRate === 100
                            ? 'success'
                            : student.completionRate >= 75
                              ? 'info'
                              : student.completionRate >= 50
                                ? 'primary'
                                : student.completionRate >= 25
                                  ? 'warning'
                                  : 'error'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
