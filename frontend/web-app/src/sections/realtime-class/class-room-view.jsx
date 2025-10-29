



'use client';

import {
  Alert,
  Box,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';

import { useClassroomContext } from 'auth-classroom';
import { Iconify } from 'src/components/iconify';
import { ActivitiesList, CurrentActivityDisplay } from './components';
import { useClassroomActivities } from './hooks';

// ----------------------------------------------------------------------

export default function ClassRoomView() {
  const { classroomState, isAuthencated } = useClassroomContext();
  const { currentActivity, activities, onlineCount, error } = useClassroomActivities();

  // Handle submission success
  const handleSubmitSuccess = (submissionData) => {
    console.log('[ClassRoomView] Submission successful:', submissionData);
    // You can add additional logic here, e.g., show a snackbar notification
  };

  if (!isAuthencated) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Alert severity="warning">Please join a classroom first.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4">{classroomState.courseName || 'Classroom'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {classroomState.courseCode}
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip
              label={`${onlineCount} students online`}
              size="small"
              variant="outlined"
              icon={<Iconify icon="solar:users-group-rounded-bold" />}
            />
          </Stack>
        </Stack>

        {/* Error Alert */}
        {error && <Alert severity="error">{error}</Alert>}

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Current Activity */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Current Activity</Typography>
              <CurrentActivityDisplay
                activity={currentActivity}
                onSubmitSuccess={handleSubmitSuccess}
              />
            </Stack>
          </Grid>

          {/* Activities List */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={2}>
              <Typography variant="h6">All Activities</Typography>
              <ActivitiesList activities={activities} />
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
