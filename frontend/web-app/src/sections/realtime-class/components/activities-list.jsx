import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function ActivitiesList({ activities }) {
  if (activities.length === 0) {
    return <Alert severity="info">No activities available yet.</Alert>;
  }

  return (
    <Stack spacing={2}>
      {activities.map((activity) => (
        <Card key={activity.id} variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={2} alignItems="center">
                <Iconify
                  icon={
                    activity.type === 'quiz'
                      ? 'solar:question-circle-bold'
                      : activity.type === 'poll'
                        ? 'solar:chart-2-bold'
                        : 'solar:chat-round-dots-bold'
                  }
                  width={24}
                />
                <Box>
                  <Typography variant="subtitle2">{activity.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {activity.type}
                  </Typography>
                </Box>
              </Stack>
              <Chip
                label={activity.status}
                size="small"
                color={
                  activity.status === 'active'
                    ? 'success'
                    : activity.status === 'completed'
                      ? 'info'
                      : 'warning'
                }
              />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
