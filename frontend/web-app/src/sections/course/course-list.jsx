import { Card, Grid } from '@mui/material';

import { EmptyContent } from 'src/components/empty-content';

import CourseItem from './course-item';

export function CourseList({ course: courses = [] }) {
  return (
    <>
      {courses.length === 0 && <Card sx={{ p: 5 }}>
        <EmptyContent title="No courses found" />
      </Card>}
      <Grid container spacing={3}>
        {courses.map((course) => (
          <Grid
            sx={{
              display: 'flex',
              width: '100vw',
            }}
            key={course.id}
            size={{
              xs: 12,
              sm: 6,
              md: 4,
              lg: 4,
              xl: 3,
            }}
          >
            <CourseItem course={course} />
          </Grid>
        ))}
      </Grid>
    </>
  );
}
