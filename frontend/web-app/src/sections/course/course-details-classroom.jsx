import { useState, useEffect } from 'react';

import {
  Box,
  Card,
  Chip,
  Grid,
  List,
  Alert,
  Badge,
  Paper,
  Stack,
  Avatar,
  Button,
  Tooltip,
  ListItem,
  CardHeader,
  IconButton,
  Typography,
  CardContent,
  ListItemText,
  LinearProgress,
  ListItemAvatar,
} from '@mui/material';

import { useSelector } from 'src/redux/hooks';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// Mock data for demonstration
const mockClassroomData = {
  isActive: true,
  sessionStartTime: '2025-09-30T14:00:00',
  totalStudents: 45,
  activeStudents: 38,
  activitiesCompleted: 12,
  pendingResponses: 8,
  currentActivity: {
    type: 'poll',
    title: 'Which topic should we cover next?',
    responses: 24,
    timeLeft: 45,
  },
  sessionMode: 'interactive', // interactive, quiz, discussion, presentation
  engagementScore: 85, // percentage
};

const mockActivities = [
  {
    id: 1,
    type: 'poll',
    title: 'Which programming language do you prefer?',
    status: 'active',
    responses: 24,
    totalOptions: 4,
    timeLeft: 45,
    icon: 'solar:chart-2-bold',
  },
  {
    id: 2,
    type: 'quiz',
    title: 'React Fundamentals Quiz',
    status: 'completed',
    responses: 38,
    totalQuestions: 5,
    averageScore: 82,
    icon: 'solar:question-circle-bold',
  },
  {
    id: 3,
    type: 'qna',
    title: 'Open Q&A Session',
    status: 'pending',
    questions: 6,
    answered: 3,
    icon: 'solar:chat-round-dots-bold',
  },
];

const mockStudentResponses = [
  {
    id: 1,
    name: 'Alice Johnson',
    avatar: '/assets/images/avatar/avatar-1.jpg',
    lastActivity: 'Poll: React vs Vue',
    time: '2 min ago',
    score: 95,
  },
  {
    id: 2,
    name: 'Bob Smith',
    avatar: '/assets/images/avatar/avatar-2.jpg',
    lastActivity: 'Quiz: JS Fundamentals',
    time: '5 min ago',
    score: 88,
  },
  {
    id: 3,
    name: 'Carol Davis',
    avatar: '/assets/images/avatar/avatar-3.jpg',
    lastActivity: 'Q&A: Async/Await',
    time: '1 min ago',
    score: 92,
  },
  {
    id: 4,
    name: 'David Wilson',
    avatar: '/assets/images/avatar/avatar-4.jpg',
    lastActivity: 'Word Cloud: APIs',
    time: '3 min ago',
    score: 79,
  },
  {
    id: 5,
    name: 'Emma Brown',
    avatar: '/assets/images/avatar/avatar-5.jpg',
    lastActivity: 'Brainstorm: Features',
    time: '1 min ago',
    score: 87,
  },
];

const mockQuestions = [
  {
    id: 1,
    student: 'Alice Johnson',
    question: 'Can you explain the difference between useEffect and useLayoutEffect?',
    time: '14:25',
    urgent: false,
    upvotes: 3,
    answered: false,
  },
  {
    id: 2,
    student: 'Bob Smith',
    question: 'How do we handle error boundaries in React?',
    time: '14:22',
    urgent: true,
    upvotes: 7,
    answered: false,
  },
];

export default function CourseDetailsClassroom() {
  const { selectedCourse } = useSelector((state) => state.classManagement);
  const [classroomData, setClassroomData] = useState(mockClassroomData);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate session duration
  const getSessionDuration = () => {
    if (!classroomData.isActive) return '00:00:00';

    const startTime = new Date(classroomData.sessionStartTime);
    const diff = Math.floor((currentTime - startTime) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Interactive Session Status Card
  const renderSessionStatus = () => (
    <Card>
      <CardHeader
        title="Interactive Session Status"
        action={
          <Chip
            label={classroomData.isActive ? 'ACTIVE' : 'ENDED'}
            color={classroomData.isActive ? 'success' : 'default'}
            variant="filled"
            icon={
              <Iconify
                icon={classroomData.isActive ? 'solar:play-circle-bold' : 'solar:pause-circle-bold'}
              />
            }
          />
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Session Duration
                </Typography>
                <Typography
                  variant="h4"
                  color={classroomData.isActive ? 'success.main' : 'text.primary'}
                >
                  {getSessionDuration()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Current Activity
                </Typography>
                <Typography variant="body1">
                  {classroomData.currentActivity?.title || 'No active activity'}
                </Typography>
                {classroomData.currentActivity?.timeLeft && (
                  <Typography variant="caption" color="warning.main">
                    {classroomData.currentActivity.timeLeft}s remaining
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
                    value={classroomData.engagementScore}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" color="success.main">
                    {classroomData.engagementScore}%
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Session Mode
                </Typography>
                <Chip
                  label={classroomData.sessionMode.toUpperCase()}
                  color="primary"
                  variant="outlined"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Activities Completed
                </Typography>
                <Typography variant="h6">{classroomData.activitiesCompleted}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Pending Responses
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {classroomData.pendingResponses}
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  // Student Engagement Analytics Card
  const renderEngagementAnalytics = () => (
    <Card>
      <CardHeader title="Student Engagement Analytics" />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary.main">
                {classroomData.activeStudents}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Active Participants
              </Typography>
              <Typography variant="caption" color="text.disabled">
                of {classroomData.totalStudents} enrolled
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {classroomData.activitiesCompleted}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Activities Completed
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(classroomData.activitiesCompleted / 15) * 100}
                sx={{ mt: 1 }}
                color="success"
              />
            </Box>
          </Grid>

          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="info.main">
                {classroomData.currentActivity?.responses || 0}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Current Responses
              </Typography>
              <LinearProgress
                variant="determinate"
                value={
                  (classroomData.currentActivity?.responses / classroomData.activeStudents) * 100 ||
                  0
                }
                sx={{ mt: 1 }}
                color="info"
              />
            </Box>
          </Grid>

          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Badge badgeContent={mockQuestions.length} color="error">
                <Typography variant="h3" color="warning.main">
                  {mockQuestions.reduce((sum, q) => sum + q.upvotes, 0)}
                </Typography>
              </Badge>
              <Typography variant="subtitle2" color="text.secondary">
                Question Upvotes
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  // Active Activities Overview
  const renderActiveActivities = () => (
    <Card>
      <CardHeader
        title="Learning Activities"
        action={
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
          >
            Create New
          </Button>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <List>
          {mockActivities.map((activity, index) => (
            <ListItem
              key={activity.id}
              divider={index < mockActivities.length - 1}
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <Chip
                    label={activity.status}
                    size="small"
                    color={
                      activity.status === 'active'
                        ? 'success'
                        : activity.status === 'completed'
                          ? 'primary'
                          : 'default'
                    }
                  />
                  <IconButton size="small">
                    <Iconify icon="solar:menu-dots-bold" />
                  </IconButton>
                </Stack>
              }
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Iconify icon={activity.icon} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={activity.title}
                secondary={
                  <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                    {activity.type === 'poll' && (
                      <>
                        <Typography variant="caption">{activity.responses} responses</Typography>
                        {activity.timeLeft && (
                          <Typography variant="caption" color="warning.main">
                            {activity.timeLeft}s left
                          </Typography>
                        )}
                      </>
                    )}
                    {activity.type === 'quiz' && (
                      <>
                        <Typography variant="caption">{activity.responses} completed</Typography>
                        <Typography variant="caption">Avg: {activity.averageScore}%</Typography>
                      </>
                    )}
                    {activity.type === 'qna' && (
                      <>
                        <Typography variant="caption">{activity.questions} questions</Typography>
                        <Typography variant="caption">{activity.answered} answered</Typography>
                      </>
                    )}
                  </Stack>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  // Student Participation List
  const renderStudentParticipation = () => (
    <Card>
      <CardHeader
        title="Student Participation"
        action={
          <Button variant="outlined" size="small" startIcon={<Iconify icon="solar:ranking-bold" />}>
            Leaderboard
          </Button>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <List>
          {mockStudentResponses.map((student, index) => (
            <ListItem
              key={student.id}
              divider={index < mockStudentResponses.length - 1}
              secondaryAction={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={`${student.score}%`}
                    size="small"
                    color={
                      student.score >= 90 ? 'success' : student.score >= 70 ? 'warning' : 'error'
                    }
                  />
                  <IconButton size="small">
                    <Iconify icon="solar:star-bold" sx={{ color: 'warning.main' }} />
                  </IconButton>
                </Stack>
              }
            >
              <ListItemAvatar>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        border: '2px solid white',
                      }}
                    />
                  }
                >
                  <Avatar src={student.avatar} alt={student.name}>
                    {student.name.charAt(0)}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={student.name}
                secondary={
                  <Stack spacing={0.5}>
                    <Typography variant="caption">{student.lastActivity}</Typography>
                    <Typography variant="caption" color="text.disabled">
                      {student.time}
                    </Typography>
                  </Stack>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  // Interactive Q&A Management
  const renderQuestionsQueue = () => (
    <Card>
      <CardHeader
        title="Q&A Management"
        action={
          <Button
            variant="contained"
            size="small"
            startIcon={<Iconify icon="solar:question-circle-bold" />}
          >
            New Q&A
          </Button>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {mockQuestions.length === 0 ? (
          <Alert severity="info">No pending questions</Alert>
        ) : (
          <Stack spacing={2}>
            {mockQuestions.map((question) => (
              <Paper
                key={question.id}
                sx={{
                  p: 2,
                  border: question.urgent ? '1px solid' : 'none',
                  borderColor: 'error.main',
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={2}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="subtitle2">{question.student}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {question.time}
                      </Typography>
                      {question.urgent && <Chip label="Urgent" size="small" color="error" />}
                      <Chip
                        label={`${question.upvotes} upvotes`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2">{question.question}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Upvote">
                      <IconButton size="small" color="primary">
                        <Iconify icon="solar:like-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Answer">
                      <IconButton size="small" color="success">
                        <Iconify icon="solar:check-circle-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Pin to Top">
                      <IconButton size="small" color="warning">
                        <Iconify icon="solar:pin-bold" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  // Quick Actions
  const renderQuickActions = () => (
    <Card>
      <CardHeader title="Interactive Activities" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Iconify icon="solar:poll-bold" />}
              disabled={classroomData.pollActive}
            >
              Create Poll
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button fullWidth variant="outlined" startIcon={<Iconify icon="solar:quiz-bold" />}>
              Quick Quiz
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button fullWidth variant="outlined" startIcon={<Iconify icon="solar:cloud-bold" />}>
              Word Cloud
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Iconify icon="solar:lightbulb-bold" />}
            >
              Brainstorm
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button fullWidth variant="outlined" startIcon={<Iconify icon="solar:graph-bold" />}>
              Show Results
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Iconify icon="solar:download-square-bold" />}
            >
              Export Data
            </Button>
          </Grid>
          <Grid item xs={12}>
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

  if (!selectedCourse) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            No course selected. Please select a course to view classroom dashboard.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Live Classroom - {selectedCourse.courseCode}
      </Typography>

      <Grid container spacing={3}>
        {/* Session Status */}
        <Grid item xs={12} md={6} lg={4}>
          {renderSessionStatus()}
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6} lg={4}>
          {renderQuickActions()}
        </Grid>

        {/* Student Participation */}
        <Grid item xs={12} md={6} lg={4}>
          {renderStudentParticipation()}
        </Grid>

        {/* Engagement Analytics */}
        <Grid item xs={12} md={8}>
          {renderEngagementAnalytics()}
        </Grid>

        {/* Active Activities */}
        <Grid item xs={12} md={4}>
          {renderActiveActivities()}
        </Grid>

        {/* Q&A Management */}
        <Grid item xs={12}>
          {renderQuestionsQueue()}
        </Grid>
      </Grid>
    </Box>
  );
}
