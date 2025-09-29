'use client';

import { useEffect } from 'react';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import { Tab, Tabs, Stack, Button } from '@mui/material';

import { useSelector } from 'src/redux/hooks';
import { DashboardContent } from 'src/layouts/dashboard';
import { ClassManagementActions } from 'src/redux/actions/reducerActions';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import CourseSort from '../course-sort';
import CourseFilter from '../course-filter';
import { CourseList } from '../course-list';
import CourseCreateDialog from '../course-create';

const TABS_OPTIONS = [
  { value: 'all', label: 'All', color: 'default' },
  { value: 'published', label: 'Published', color: 'info' },
  { value: 'disabled', label: 'Disabled', color: 'error' },
  { value: 'archived', label: 'Archived', color: 'warning' },
];

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'az', label: 'A-Z' },
  { value: 'za', label: 'Z-A' },
];

export function CourseView() {
  const classManagement = useSelector((state) => state.classManagement);
  //console.log(classManagement);

  const openFilters = useBoolean();
  const openCoursesCreateDialog = useBoolean();
  const filterState = useSetState({});
  const { state, setField } = useSetState({
    publish: 'all',
    search: '',
    sort: 'latest',
  });

  const handleTabChange = (event, newValue) => {
    setField('publish', newValue);
  };
  const handleSearch = (keyword) => {
    setField('search', keyword);
  };
  const handleSort = (sort) => {
    setField('sort', sort);
  };

  const renderFilterAndSort = () => (
    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="end">
      {/*  Sort By   */}
      <CourseSort sort={state.sort} sortOptions={SORT_OPTIONS} onSort={handleSort} />
      <CourseFilter
        open={openFilters.value}
        onOpen={openFilters.onTrue}
        onClose={openFilters.onFalse}
      />
    </Stack>
  );

  const renderTabs = () => (
    <Tabs value={state.publish} onChange={handleTabChange} sx={{ mb: { xs: 3, md: 3 } }}>
      {TABS_OPTIONS.map((tab) => (
        <Tab
          key={tab.value}
          iconPosition="end"
          value={tab.value}
          label={tab.label}
          icon={
            <Label
              variant={((tab.value === 'all' || tab.value === state.publish) && 'filled') || 'soft'}
              color={tab.color}
            />
          }
          sx={{ textTransform: 'capitalize' }}
        />
      ))}
    </Tabs>
  );

  useEffect(() => {
    // Fetch all courses
    ClassManagementActions.getAllCourses();
  }, []);

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Course"
        action={
          <>
            <Button
              startIcon={<Iconify icon="mingcute:add-line" />}
              variant="contained"
              onClick={openCoursesCreateDialog.onTrue}
            >
              Add Course
            </Button>
            <CourseCreateDialog
              open={openCoursesCreateDialog.value}
              onClose={openCoursesCreateDialog.onFalse}
            />
          </>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <Stack direction="column" spacing={2.5}>
        {renderFilterAndSort()}
        {renderTabs()}
        <CourseList course={classManagement.courses} />
      </Stack>
    </DashboardContent>
  );
}
