import { Grid } from "@mui/material";
import CourseItem from "./course-item";
import { EmptyContent } from "src/components/empty-content";







export function CourseList({ course: courses = [] }) {
    return (
        <>
            {courses.length === 0 && <EmptyContent title="No courses found" />}
            <Grid container spacing={3}>
                {courses.map((course) => (
                    <Grid key={course.id} item xs={12} sm={6} md={4}>
                        <CourseItem course={course} />
                    </Grid>
                ))}
            </Grid>
        </>
    )
}