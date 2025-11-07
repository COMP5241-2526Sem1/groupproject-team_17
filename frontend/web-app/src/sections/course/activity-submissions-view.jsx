'use client';

import {
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Slide,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { activityAPI } from 'src/api/api-function-call';
import { Iconify } from 'src/components/iconify';
import StudentSubmissionDetail from './student-submission-detail';

export default function ActivitySubmissionsView({ activity, onBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [fullActivityData, setFullActivityData] = useState(null);

  const fetchActivityData = useCallback(async () => {
    if (!activity?.id) return;

    try {
      const response = await activityAPI.getActivity(activity.id);
      if (response.code === 0 && response.data) {
        setFullActivityData(response.data);
      }
    } catch (error) {
      console.error('Error fetching activity data:', error);
    }
  }, [activity?.id]);

  const fetchSubmissions = useCallback(async () => {
    if (!activity?.id) return;

    setLoading(true);
    try {
      const response = await activityAPI.getActivitySubmissionsWithStudents(activity.id);
      if (response.code === 0 && response.data) {
        setSubmissions(response.data);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  }, [activity?.id]);

  useEffect(() => {
    fetchActivityData();
    fetchSubmissions();
  }, [fetchActivityData, fetchSubmissions]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetail = (submission) => {
    setSelectedSubmission(submission);
  };

  const handleBackToList = () => {
    setSelectedSubmission(null);
  };

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

  const getActivityTypeLabel = (type) => {
    const normalizedType = typeof type === 'number'
      ? (type === 1 ? 'quiz' : type === 2 ? 'poll' : 'discussion')
      : type?.toLowerCase();

    switch (normalizedType) {
      case 'quiz':
      case '1':
        return 'Quiz';
      case 'poll':
      case 'polling':
      case '2':
        return 'Poll';
      case 'discussion':
      case '3':
        return 'Discussion';
      default:
        return 'Unknown';
    }
  };

  // If submission is selected, show detail view
  if (selectedSubmission) {
    return (
      <Slide direction="left" in={!!selectedSubmission} mountOnEnter unmountOnExit>
        <Box>
          <StudentSubmissionDetail
            submission={selectedSubmission}
            activity={fullActivityData || activity}
            onBack={handleBackToList}
          />
        </Box>
      </Slide>
    );
  }

  // Show submissions list
  const paginatedSubmissions = submissions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Slide direction="right" in={!selectedSubmission} mountOnEnter unmountOnExit>
      <Box>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <IconButton onClick={onBack}>
            <Iconify icon="eva:arrow-back-fill" />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{activity.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {getActivityTypeLabel(activity.type)} - {submissions.length} submission(s)
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="eva:refresh-fill" />}
            onClick={() => {
              fetchActivityData();
              fetchSubmissions();
            }}
          >
            Refresh
          </Button>
        </Stack>

        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Submitted At</TableCell>
                  {activity.type === 1 || activity.type === 'quiz' ? (
                    <TableCell>Score</TableCell>
                  ) : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" sx={{ py: 3 }}>
                        Loading submissions...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : paginatedSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" sx={{ py: 3 }}>
                        No submissions yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSubmissions.map((submission) => (
                    <TableRow
                      key={submission.id}
                      hover
                      onClick={() => handleViewDetail(submission)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        }
                      }}
                    >
                      <TableCell>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: 'primary.main',
                            '&:hover': {
                              textDecoration: 'underline',
                            }
                          }}
                        >
                          {submission.student?.studentId || submission.studentId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {submission.student?.fullName ||
                            `${submission.student?.firstName || ''} ${submission.student?.lastName || ''}`.trim() ||
                            'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {submission.student?.email || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(submission.submittedAt)}
                        </Typography>
                      </TableCell>
                      {activity.type === 1 || activity.type === 'quiz' ? (
                        <TableCell>
                          <Chip
                            label={`${submission.score?.toFixed(1) || 0}%`}
                            color={
                              submission.score >= 80 ? 'success' :
                                submission.score >= 60 ? 'warning' : 'error'
                            }
                            size="small"
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={submissions.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Card>
      </Box>
    </Slide>
  );
}
