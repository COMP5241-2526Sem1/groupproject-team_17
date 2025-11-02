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
  joinedStudentsCount,
  totalStudents,
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
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
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
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
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
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
