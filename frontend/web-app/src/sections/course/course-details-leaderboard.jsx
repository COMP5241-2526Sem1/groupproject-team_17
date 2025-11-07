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
  TablePagination,
  TableRow,
  Typography
} from '@mui/material';

import { useSelector } from 'src/redux/hooks';

import { Iconify } from 'src/components/iconify';

import { courseAPI } from 'src/api/api-function-call';

export default function CourseDetailsLeaderboard() {
  const { selectedCourse } = useSelector((state) => state.classManagement);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchLeaderboardData = async () => {
    if (!selectedCourse?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Call the backend API to get leaderboard data
      const response = await courseAPI.getLeaderboard(selectedCourse.id);

      if (response.code !== 0 || !response.data) {
        throw new Error(response.message || 'Failed to fetch leaderboard');
      }

      setTotalActivities(response.data.totalActivities);
      setLeaderboardData(response.data.students);
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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Rank', 'Student ID', 'Completed Activities', 'Total Activities', 'Completion Rate (%)', 'Quiz Score', 'Max Quiz Score', 'Quiz Score (%)'];
    const rows = leaderboardData.map((student) => [
      student.rank,
      student.studentId,
      student.completedActivities,
      student.totalActivities,
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
          <>
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
                  {leaderboardData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((student, index) => (
                      <TableRow key={student.studentId} hover>
                        {/* Rank */}
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {student.rank === 1 && (
                              <Iconify icon="eva:trophy-fill" sx={{ color: 'warning.main' }} />
                            )}
                            {student.rank === 2 && (
                              <Iconify icon="eva:trophy-fill" sx={{ color: 'grey.500' }} />
                            )}
                            {student.rank === 3 && (
                              <Iconify icon="eva:trophy-fill" sx={{ color: '#CD7F32' }} />
                            )}
                            <Typography variant="h6">#{student.rank}</Typography>
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
                              {student.completedActivities}/{student.totalActivities}
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

            <TablePagination
              component="div"
              count={leaderboardData.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
