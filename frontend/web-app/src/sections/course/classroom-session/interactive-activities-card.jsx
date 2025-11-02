'use client';

import { Button, Card, CardContent, CardHeader, Grid } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function InteractiveActivitiesCard({
  onCreatePoll,
  onCreateQuiz,
  onCreateDiscussion,
  onCreateMCQuestion,
}) {
  return (
    <Card>
      <CardHeader title="Interactive Activities" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={{ md: 6 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Iconify icon="solar:document-text-bold" />}
              onClick={onCreateMCQuestion}
            >
              MC Question
            </Button>
          </Grid>
          <Grid size={{ md: 6 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Iconify icon="solar:poll-bold" />}
              onClick={onCreatePoll}
            >
              Create Poll
            </Button>
          </Grid>
          <Grid size={{ md: 6 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Iconify icon="solar:quiz-bold" />}
              onClick={onCreateQuiz}
            >
              Quick Quiz
            </Button>
          </Grid>
          <Grid size={{ md: 6 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Iconify icon="solar:chat-round-line-bold" />}
              onClick={onCreateDiscussion}
            >
              Discussion
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
