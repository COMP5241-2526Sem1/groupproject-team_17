'use client';

import { Button, Card, CardContent, CardHeader, Grid } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function InteractiveActivitiesCard({ onCreatePoll, onCreateQuiz }) {
  return (
    <Card>
      <CardHeader title="Interactive Activities" />
      <CardContent>
        <Grid container spacing={2}>
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
            <Button fullWidth variant="outlined" startIcon={<Iconify icon="solar:cloud-bold" />}>
              Word Cloud
            </Button>
          </Grid>
          <Grid size={{ md: 6 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Iconify icon="solar:lightbulb-bold" />}
            >
              Brainstorm
            </Button>
          </Grid>
          <Grid size={{ md: 6 }}>
            <Button fullWidth variant="outlined" startIcon={<Iconify icon="solar:graph-bold" />}>
              Show Results
            </Button>
          </Grid>
          <Grid size={{ md: 6 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Iconify icon="solar:download-square-bold" />}
            >
              Export Data
            </Button>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button
              fullWidth
              variant="contained"
              color="error"
              startIcon={<Iconify icon="solar:power-bold" />}
            >
              End Session
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
