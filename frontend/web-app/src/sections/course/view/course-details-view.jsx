'use client';

import { useTabs } from 'minimal-shared/hooks';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material';

import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { ClassManagementActions } from 'src/redux/actions/reducerActions';
import { useSelector } from 'src/redux/hooks';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Iconify } from 'src/components/iconify';
import { Label } from 'src/components/label';

import CourseDetailsActivityResult from '../course-details-activity-result';
import CourseDetailsClassroom from '../course-details-classroom';
import CourseDetailsLeaderboard from '../course-details-leaderboard';
import CourseDetailsSettings from '../course-details-settings';
import CourseDetailsStudents from '../course-details-students';

const TABS = [
  { value: 'classroom', label: 'Classroom', icon: 'eva:home-fill' },
  { value: 'students', label: 'Students', icon: 'eva:people-fill' },
  { value: 'leaderboard', label: 'LeaderBoard', icon: 'eva:book-fill' },
  { value: 'activity-result', label: 'Activity Result', icon: 'eva:clipboard-fill' },
  { value: 'settings', label: 'Settings', icon: 'eva:settings-2-fill' },
];

export default function CourseDetailsView({ sx, ...other }) {
  const router = useRouter();
  const { selectedCourse } = useSelector((state) => state.classManagement);
  const tabs = useTabs(TABS[0].value);
  const { id } = useParams();

  const renderToolBar = () => (
    <Box sx={[{ mb: 2, gap: 1.5, display: 'flex' }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <Button
        component={RouterLink}
        href={paths.dashboard.root}
        startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={16} />}
      >
        Back
      </Button>
    </Box>
  );

  const renderTabs = () => (
    <Tabs value={tabs.value} onChange={tabs.onChange} sx={{ mb: { xs: 3, md: 5 } }}>
      {TABS.map((tab) => (
        <Tab
          key={tab.value}
          value={tab.value}
          label={tab.label}
          sx={{ textTransform: 'capitalize' }}
          icon={<Iconify icon={tab.icon} width={20} height={20} sx={{ mr: 1 }} />}
        />
      ))}
    </Tabs>
  );

  useEffect(() => {
    const fetchData = async (params) => {
      var res = await ClassManagementActions.getCourseDetails(id);
      if (res?.code !== 0) {
        // go back to course list page
        // use next router
        router.push(paths.dashboard.courses);
        return;
      }
    };
    fetchData();
  }, [id]);
  function convertSemester(sem) {
    switch (sem) {
      case 'one': return '1';
      case 'two': return '2';
      case 'three': return '3';
      case 'none': return '';


    }
  }
  return (
    <DashboardContent>
      {renderToolBar()}
      <CustomBreadcrumbs
        heading={selectedCourse?.courseCode || 'Course Details'}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:qr-code-bold" width={20} />}
            onClick={() => {
              if (!selectedCourse?.id && !selectedCourse?.joinCode) {
                console.error('No courseId or joinCode provided');
                return;
              }
              const code = selectedCourse.joinCode || selectedCourse.id;
              const baseUrl = window.location.origin;
              const qrUrl = `${baseUrl}/qr?class=${code}`;
              const width = 600;
              const height = 800;
              const left = (window.screen.width - width) / 2;
              const top = (window.screen.height - height) / 2;
              window.open(
                qrUrl,
                'JoinClassroomQR',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`
              );
            }}
            disabled={!selectedCourse?.joinCode}
          >
            Join QR Code
          </Button>
        }
      />
      <Stack sx={{ mb: 3 }}>
        <Typography variant="h6">{selectedCourse?.courseName}</Typography>
        <Box sx={{ height: 8, width: 120 }}>
          <Label
            color={
              selectedCourse?.isArchived ? 'warning' : selectedCourse?.isEnabled ? 'info' : 'error'
            }
          >
            {`${selectedCourse?.academicYear}/${selectedCourse?.academicYear + 1} - SEM${convertSemester(selectedCourse?.semester)} `}
          </Label>
        </Box>
      </Stack>

      {renderTabs()}
      {tabs.value === 'classroom' && <CourseDetailsClassroom />}
      {tabs.value === 'students' && (
        <CourseDetailsStudents studentsData={selectedCourse?.students} />
      )}
      {tabs.value === 'leaderboard' && <CourseDetailsLeaderboard />}
      {tabs.value === 'activity-result' && <CourseDetailsActivityResult />}
      {tabs.value === 'settings' && <CourseDetailsSettings />}
    </DashboardContent>
  );
}
