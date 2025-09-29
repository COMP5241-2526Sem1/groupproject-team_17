'use client';

import { useTabs } from 'minimal-shared/hooks';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Box, Button, Tab, Tabs } from '@mui/material';

import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { ClassManagementActions } from 'src/redux/actions/reducerActions';
import { useSelector } from 'src/redux/hooks';

import { Iconify } from 'src/components/iconify';

import CourseDetailsStudents from '../course-details-students';

const TABS = [
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
      {renderTabs()}
      {tabs.value === 'students' && <CourseDetailsStudents studentsData={selectedCourse?.students} />}
    </DashboardContent>
  );
}
