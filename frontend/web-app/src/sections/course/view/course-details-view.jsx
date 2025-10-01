'use client';

import { useEffect } from 'react';
import { useTabs } from 'minimal-shared/hooks';
import { useParams, useRouter } from 'next/navigation';

import { Box, Tab, Tabs, Stack, Button, Typography } from '@mui/material';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useSelector } from 'src/redux/hooks';
import { DashboardContent } from 'src/layouts/dashboard';
import { ClassManagementActions } from 'src/redux/actions/reducerActions';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import CourseDetailsSettings from '../course-details-settings';
import CourseDetailsStudents from '../course-details-students';
import CourseDetailsClassroom from '../course-details-classroom';

const TABS = [
  { value: 'classroom', label: 'Classroom', icon: 'eva:home-fill' },
  { value: 'students', label: 'Students', icon: 'eva:people-fill' },
  { value: 'materials', label: 'Materials', icon: 'eva:book-fill' },
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

  return (
    <DashboardContent>
      {renderToolBar()}
      <CustomBreadcrumbs heading={selectedCourse?.courseCode || 'Course Details'} />
      <Stack sx={{ mb: 3 }}>
        <Typography variant="h6">{selectedCourse?.courseName}</Typography>
        <Box sx={{ height: 8, width: 120 }}>
          <Label
            color={
              selectedCourse?.isArchived ? 'warning' : selectedCourse?.isEnabled ? 'info' : 'error'
            }
          >
            {`${selectedCourse?.academicYear}/${selectedCourse?.academicYear + 1} - SEM${selectedCourse?.semester}`}
          </Label>
        </Box>
      </Stack>

      {renderTabs()}
      {tabs.value === 'classroom' && <CourseDetailsClassroom />}
      {tabs.value === 'students' && (
        <CourseDetailsStudents studentsData={selectedCourse?.students} />
      )}
      {tabs.value === 'materials' && <div>Materials Section - To be implemented</div>}
      {tabs.value === 'settings' && <CourseDetailsSettings />}
    </DashboardContent>
  );
}
