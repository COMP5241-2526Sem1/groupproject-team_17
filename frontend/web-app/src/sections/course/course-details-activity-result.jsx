'use client';

import {
  Box,
  Button,
  Card,
  Chip,
  Slide,
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
import { useCallback, useEffect, useState } from 'react';
import { activityAPI } from 'src/api/api-function-call';
import { Iconify } from 'src/components/iconify';
import { useSelector } from 'src/redux/hooks';
import ActivitySubmissionsView from './activity-submissions-view';

export default function CourseDetailsActivityResult() {
  const { selectedCourse } = useSelector((state) => state.classManagement);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const fetchActivities = useCallback(async () => {
    if (!selectedCourse?.id) return;

    setLoading(true);
    try {
      const response = await activityAPI.getCourseActivities(selectedCourse.id, false);
      if (response.code === 0 && response.data) {
        setActivities(response.data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCourse?.id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewSubmissions = (activity) => {
    setSelectedActivity(activity);
  };

  const handleBack = () => {
    setSelectedActivity(null);
  };

  const getActivityTypeLabel = (type) => {
    const normalizedType = typeof type === 'number'
      ? (type === 1 ? 'quiz' : type === 2 ? 'poll' : 'discussion')
      : type?.toLowerCase();

    switch (normalizedType) {
      case 'quiz':
      case '1':
        return { label: 'Quiz', color: 'primary' };
      case 'poll':
      case 'polling':
      case '2':
        return { label: 'Poll', color: 'info' };
      case 'discussion':
      case '3':
        return { label: 'Discussion', color: 'success' };
      default:
        return { label: 'Unknown', color: 'default' };
    }
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

  // If activity is selected, show submissions view
  if (selectedActivity) {
    return (
      <Slide direction="left" in={!!selectedActivity} mountOnEnter unmountOnExit>
        <Box>
          <ActivitySubmissionsView
            activity={selectedActivity}
            onBack={handleBack}
          />
        </Box>
      </Slide>
    );
  }

  // Show activities list
  const paginatedActivities = activities.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Slide direction="right" in={!selectedActivity} mountOnEnter unmountOnExit>
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Typography variant="h6">Activity Results</Typography>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="eva:refresh-fill" />}
            onClick={fetchActivities}
          >
            Refresh
          </Button>
        </Stack>

        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Expires At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" sx={{ py: 3 }}>
                        Loading activities...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : paginatedActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" sx={{ py: 3 }}>
                        No activities found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedActivities.map((activity) => {
                    const typeInfo = getActivityTypeLabel(activity.type);
                    return (
                      <TableRow
                        key={activity.id}
                        hover
                        onClick={() => handleViewSubmissions(activity)}
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
                            {activity.title}
                          </Typography>
                          {activity.description && (
                            <Typography variant="caption" color="text.secondary">
                              {activity.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={typeInfo.label}
                            color={typeInfo.color}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={activity.isActive ? 'Active' : 'Inactive'}
                            color={activity.isActive ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(activity.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(activity.expiresAt)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={activities.length}
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
