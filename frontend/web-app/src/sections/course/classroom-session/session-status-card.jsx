'use client';

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function SessionStatusCard({
  isConnected,
  isClassroomActive,
  currentActivity,
  engagementScore,
  joinedStudentsCount,
  totalStudents,
  sessionMode,
  activitiesCompleted,
  pendingResponses,
}) {
  return (
    <Card>
      <CardHeader
        title="Interactive Session Status"
        action={
          <Stack direction="row" spacing={1}>
            <Chip
              label={isConnected ? 'WS Connected' : 'WS Disconnected'}
              size="small"
              color={isConnected ? 'success' : 'error'}
              variant="outlined"
              icon={
                <Iconify
                  icon={
                    isConnected
                      ? 'solar:wifi-router-bold'
                      : 'solar:wifi-router-minimalistic-bold'
                  }
                />
              }
            />
            <Chip
              label={isClassroomActive ? 'ACTIVE' : 'ENDED'}
              color={isClassroomActive ? 'success' : 'default'}
              variant="filled"
              icon={
                <Iconify
                  icon={
                    isClassroomActive ? 'solar:play-circle-bold' : 'solar:pause-circle-bold'
                  }
                />
              }
            />
          </Stack>
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Current Activity
                </Typography>
                {currentActivity ? (
                  <>
                    <Typography variant="body1" fontWeight="medium">
                      {currentActivity.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {currentActivity.type === 1
                        ? 'Quiz'
                        : currentActivity.type === 2
                          ? 'Poll'
                          : 'Discussion'}
                      {currentActivity.description && ` • ${currentActivity.description}`}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body1" color="text.secondary">
                    No active activity
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Engagement Score
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LinearProgress
                    variant="determinate"
                    value={engagementScore}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" color="success.main">
                    {engagementScore}%
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Students Online
                </Typography>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography variant="h4" color="primary.main">
                    {joinedStudentsCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    / {totalStudents} enrolled
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={totalStudents ? (joinedStudentsCount / totalStudents) * 100 : 0}
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  color="primary"
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Session Mode
                </Typography>
                <Chip
                  label={sessionMode.toUpperCase()}
                  color="primary"
                  variant="outlined"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Activities Completed
                </Typography>
                <Typography variant="h6">{activitiesCompleted}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Pending Responses
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {pendingResponses}
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
