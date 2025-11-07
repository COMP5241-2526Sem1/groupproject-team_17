'use client';

import { Box, Button, Card, CardContent, CardHeader, Grid, Typography } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function InteractiveActivitiesCard({
  onCreatePoll,
  onCreateQuiz,
  onCreateDiscussion,
  onCreateMCQuestion,
  onOpenAIAssistant,
}) {
  return (
    <Grid container spacing={2}>
      {/* AI Assistant Card - Full Width at Top */}
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #66eaa4ff 0%, #0c705cff 100%)',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #0cf478ff 0%, #0c705cff 100%)',
              transform: 'translateY(-4px)',
              boxShadow: (theme) => theme.shadows[8],
            },
          }}
          onClick={onOpenAIAssistant}
        >
          <CardContent
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              py: 3,
            }}
          >
            <Box
              sx={{
                mr: 3,
                p: 2,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Iconify icon="solar:magic-stick-3-bold" width={48} height={48} />
            </Box>
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                AI Assistant
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Create quizzes, polls, and discussions with AI help - Just describe what you need!
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Activity Buttons Card */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title="Quick Create Activities" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Button fullWidth variant="outlined" onClick={onCreateMCQuestion}>
                  MC Question
                </Button>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Button fullWidth variant="outlined" onClick={onCreatePoll}>
                  Create Poll
                </Button>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Button fullWidth variant="outlined" onClick={onCreateQuiz}>
                  Quick Quiz
                </Button>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Button fullWidth variant="outlined" onClick={onCreateDiscussion}>
                  Discussion
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
