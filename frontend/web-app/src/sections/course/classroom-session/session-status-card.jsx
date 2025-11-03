'use client';

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  Typography
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
                    {(() => {
                      // Normalize type to handle both numeric and string types
                      let normalizedType;
                      if (typeof currentActivity.type === 'number') {
                        normalizedType = currentActivity.type === 1 ? 'quiz' : currentActivity.type === 2 ? 'poll' : 'discussion';
                      } else {
                        const lowerType = currentActivity.type?.toLowerCase();
                        normalizedType = lowerType === 'polling' ? 'poll' : lowerType;
                      }

                      const displayType = normalizedType === 'quiz' ? 'Quiz' : normalizedType === 'poll' ? 'Poll' : 'Discussion';
                      return displayType;
                    })()}
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


        </Grid>
      </CardContent>
    </Card>
  );
}
