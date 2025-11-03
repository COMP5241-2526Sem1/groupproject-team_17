'use client';

import { useMemo, useState, useEffect } from 'react';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import {
  Box,
  Tab,
  Chip,
  Tabs,
  Stack,
  Button,
  TextField,
  IconButton,
  Typography,
  InputAdornment,
} from '@mui/material';

import { useSelector } from 'src/redux/hooks';
import { DashboardContent } from 'src/layouts/dashboard';
import { ClassManagementActions } from 'src/redux/actions/reducerActions';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import CourseSort from '../course-sort';
import { CourseList } from '../course-list';
import CourseCreateDialog from '../course-create-course-dialog';

const TABS_OPTIONS = [
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
    publish: 'published',
    search: '',
    sort: 'latest',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query for performance
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(state.search);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [state.search]);

  const handleTabChange = (event, newValue) => {
    setField('publish', newValue);
  };
  const handleSearch = (keyword) => {
    setField('search', keyword);
  };
  const handleSort = (sort) => {
    setField('sort', sort);
  };
  const totalCourses = classManagement?.courses?.length ?? 0;
  const publishedCourses =
    classManagement?.courses?.filter((course) => course.isEnabled && !course.isArchived)?.length ??
    0;
  const disabledCourses =
    classManagement?.courses?.filter((course) => !course.isEnabled && !course.isArchived)?.length ??
    0;
  const archivedCourses =
    classManagement?.courses?.filter((course) => course.isArchived)?.length ?? 0;

  // Memoized filtered courses for better performance
  const filteredCourses = useMemo(() => {
    if (!classManagement?.courses || !Array.isArray(classManagement.courses)) return [];

    let filtered = [];

    // Filter by publication status (tab)
    switch (state.publish) {
      case 'published':
        filtered = classManagement.courses.filter(
          (course) => course.isEnabled && !course.isArchived
        );
        break;
      case 'disabled':
        filtered = classManagement.courses.filter(
          (course) => !course.isEnabled && !course.isArchived
        );
        break;
      case 'archived':
        filtered = classManagement.courses.filter((course) => course.isArchived);
        break;
      default:
        filtered = classManagement.courses;
        break;
    }

    // Apply search filter (using debounced search for performance)
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((course) => {
        // Helper function to safely convert to searchable string
        const toSearchableString = (value) => {
          if (value == null) return '';
          if (typeof value === 'string') return value.toLowerCase();
          return String(value).toLowerCase();
        };

        return (
          toSearchableString(course.courseCode).includes(searchLower) ||
          toSearchableString(course.courseName).includes(searchLower) ||
          toSearchableString(course.description).includes(searchLower) ||
          toSearchableString(course.semester).includes(searchLower) ||
          toSearchableString(course.year).includes(searchLower)
        );
      });
    }

    // Apply additional filters from the filter drawer
    if (filterState.status && Array.isArray(filterState.status) && filterState.status.length > 0) {
      filtered = filtered.filter((course) => filterState.status.includes(course.status));
    }

    if (
      filterState.semester &&
      Array.isArray(filterState.semester) &&
      filterState.semester.length > 0
    ) {
      filtered = filtered.filter((course) => filterState.semester.includes(course.semester));
    }

    if (filterState.year && Array.isArray(filterState.year) && filterState.year.length > 0) {
      filtered = filtered.filter((course) => filterState.year.includes(course.year?.toString()));
    }

    if (
      filterState.students &&
      Array.isArray(filterState.students) &&
      filterState.students.length === 2
    ) {
      const [min, max] = filterState.students;
      filtered = filtered.filter((course) => {
        const studentCount = course.students?.length || 0;
        return studentCount >= min && studentCount <= max;
      });
    }

    // Apply sorting
    if (Array.isArray(filtered)) {
      filtered.sort((a, b) => {
        switch (state.sort) {
          case 'latest': {
            // Sort by creation date, fallback to modified date, then ID
            const aDate = new Date(a.createdAt || a.updatedAt || 0);
            const bDate = new Date(b.createdAt || b.updatedAt || 0);
            return bDate - aDate;
          }
          case 'oldest': {
            const aDateOld = new Date(a.createdAt || a.updatedAt || 0);
            const bDateOld = new Date(b.createdAt || b.updatedAt || 0);
            return aDateOld - bDateOld;
          }
          case 'az': {
            // Sort by course code, fallback to course name
            const aCode = (a.courseCode || a.courseName || '').toLowerCase();
            const bCode = (b.courseCode || b.courseName || '').toLowerCase();
            return aCode.localeCompare(bCode);
          }
          case 'za': {
            const aCodeZ = (a.courseCode || a.courseName || '').toLowerCase();
            const bCodeZ = (b.courseCode || b.courseName || '').toLowerCase();
            return bCodeZ.localeCompare(aCodeZ);
          }
          default:
            return 0;
        }
      });
    }

    return Array.isArray(filtered) ? filtered : [];
  }, [classManagement?.courses, state.publish, debouncedSearch, filterState, state.sort]);

  const getCount = (tabValue) => {
    switch (tabValue) {
      case 'all':
        return totalCourses;
      case 'published':
        return publishedCourses;
      case 'disabled':
        return disabledCourses;
      case 'archived':
        return archivedCourses;
      default:
        return 0;
    }
  };

  const renderFilterAndSort = () => (
    <Stack spacing={2}>
      {/* Search Bar and Sort Row - Responsive Layout */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <TextField
          placeholder="Search courses..."
          value={state.search}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
            endAdornment: state.search && (
              <InputAdornment position="end">
                <IconButton onClick={() => handleSearch('')} edge="end" size="small">
                  <Iconify icon="eva:close-fill" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1 }}
        />
        <Box sx={{ minWidth: { xs: 'auto', sm: 200 } }}>
          <CourseSort sort={state.sort} sortOptions={SORT_OPTIONS} onSort={handleSort} />
        </Box>
      </Stack>
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
            >
              {getCount(tab.value)}
            </Label>
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

        {/* Results count and active filters */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minHeight: 32 }}>
          <Typography variant="body2" color="text.secondary">
            {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
          </Typography>

          {/* Show active search indicator */}
          {debouncedSearch && (
            <Chip
              label={`Search: "${debouncedSearch}"`}
              size="small"
              onDelete={() => setField('search', '')}
              color="primary"
              variant="outlined"
            />
          )}
        </Stack>

        <CourseList course={filteredCourses} />
      </Stack>
    </DashboardContent>
  );
}
