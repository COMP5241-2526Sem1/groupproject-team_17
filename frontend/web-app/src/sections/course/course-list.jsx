import { Grid } from '@mui/material';

import { EmptyContent } from 'src/components/empty-content';

import CourseItem from './course-item';

export function CourseList({ course: courses = [] }) {
  return (
    <>
      {courses.length === 0 && <EmptyContent title="No courses found" />}
      <Grid container spacing={3}>
        {courses.map((course) => (
          <Grid
            sx={{
              display: 'flex',
              width: '100vw',
            }}
            key={course.id}
            size={{
              sm: 12,
              md: 6,
              lg: 4,
              xl: 4,
            }}
          >
            <CourseItem course={course} />
          </Grid>
        ))}
      </Grid>
    </>
  );
}
