import { usePopover } from 'minimal-shared/hooks';

import { Card, ListItemText, Stack, Tooltip, Typography, useMediaQuery } from '@mui/material';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Label } from 'src/components/label';

export default function CourseItem({ course }) {
  // Check if screen is desktop
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('md'));
  const menuActions = usePopover();

  const getColor = (courseData) => {
    if (courseData.isEnabled === true) {
      return 'info';
    }
    if (courseData.isArchived === true) {
      return 'warning';
    }
    return 'error';
  };
  const semesterText = (semester) => {
    switch (semester) {
      case 'one':
        return 'SEM 1';
      case 'two':
        return 'SEM 2';
      case 'summer':
        return 'SEM 3';
      default:
        return '';
    }
  }
  const renderInfoBlock = () => (
    <ListItemText
      sx={{ mb: 1, minHeight: 80 }}
      primary={
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Tooltip title={course.courseCode}>
            <Typography
              component={RouterLink}
              href={`${course.id}`}
              passHref
              sx={{
                textTransform: 'uppercase',
                fontWeight: 'bold',
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '120px',
              }}
              variant="h6"
            >
              {course.courseCode}
            </Typography>
          </Tooltip>
          <Label variant="soft" color={getColor(course)} sx={{ textTransform: 'uppercase' }}>
            {`${course.academicYear}/${course.academicYear + 1} ${semesterText(course.semester)}`}
          </Label>
        </Stack>
      }
      secondary={
        <Tooltip title={course.courseName}>
          <Typography
            sx={{
              typography: 'subtitle1',
              color: 'text.disabled',
            }}
          >
            {`${course.courseName}`}
          </Typography>
        </Tooltip>
      }
      slotProps={{
        primary: { sx: { typography: 'h6' } },
        secondary: {
          sx: {
            mt: 1,
            typography: 'subtitle1',
            color: 'text.disabled',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
            maxWidth: '300px',
            maxHeight: '3.2em', // 約2行的高度
          },
        },
      }}
    />
  );

  const renderSubNumber = () => (
    <Stack direction="row" spacing={1} alignItems="center">
      <Iconify icon="eva:people-fill" width={16} height={16} sx={{ color: 'success.main' }} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {course?.students?.length} Students
      </Typography>
    </Stack>
  );
  return (
    <Card
      sx={{
        p: 3,
        width: '100vw',
        height: '160px',
      }}
    >
      {/*       <IconButton onClick={menuActions.onOpen} sx={{ position: 'absolute', top: 20, right: 8 }}>
        <Iconify icon="eva:more-vertical-fill" />
      </IconButton> */}
      <Stack direction="column" spacing={2} mb={3}>
        {renderInfoBlock()}
        {renderSubNumber()}
      </Stack>
    </Card>
  );
}
