'use client';

import { useRouter } from 'next/navigation';

import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { useClassroomContext } from 'auth-classroom';
import { removeCookie } from 'minimal-shared/utils';
import { SettingsButton } from 'src/layouts/components/settings-button';

// ----------------------------------------------------------------------

export default function ClassroomLayout({ children }) {

  const router = useRouter();
  const {
    classroomState,
    studentState,
    isAuthencated,
    leaveClassroom,
  } = useClassroomContext();

  const courseName = classroomState.courseName || 'Classroom';
  const courseCode = classroomState.courseCode || '';
  const studentId = studentState.studentId || '';
  const studentName = studentState.studentName || '';

  // Handle leave classroom
  const handleLeaveClassroom = () => {
    removeCookie('classroom_join_token');
    leaveClassroom();
    router.push('/classroom');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top AppBar */}
      <AppBar position="static" elevation={1}>
        <Container maxWidth={false}>
          <Toolbar disableGutters>
            {/* Course Info */}
            <Box sx={{ flexGrow: 1 }}>
              {courseCode && (
                <Typography variant="h6" color="inherit" sx={{ opacity: 0.8 }}>
                  {courseCode}
                </Typography>
              )}
            </Box>

            {/* Student Info & Actions */}
            <Stack direction="row" spacing={2} alignItems="center">
              {/* Settings Button */}
              <SettingsButton />

              {/* Student Info */}
              {isAuthencated && <Tooltip title={`${studentName || studentId}`}>
                <Avatar
                  sx={{ width: 32, height: 32, bgcolor: 'primary.lighter', color: 'primary.main' }}
                >
                  {(studentName || studentId).charAt(0).toUpperCase()}
                </Avatar>
              </Tooltip>}

              {/* Leave Button */}
              {isAuthencated && <Tooltip title="Leave Classroom">
                <IconButton color="inherit" onClick={handleLeaveClassroom} size="small">
                  <Iconify icon="eva:log-out-outline" width={20} />
                </IconButton>
              </Tooltip>}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, bgcolor: 'background.default' }}>{children}</Box>
    </Box>
  );
}

