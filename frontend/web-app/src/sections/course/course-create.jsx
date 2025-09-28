import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack } from "@mui/material";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Form, RHFTextField } from "src/components/hook-form";
import { Iconify } from "src/components/iconify";
import { ClassManagementActions } from "src/redux/actions/reducerActions";
import * as z from 'zod';

// if semester is not a number, show error
const newCourseSchema = z.object({
    academicYear: z.number().min(1970).max(2100),
    semester: z.number().min(0).max(3), // 1 =Spring, 2=Winter, 3=Summer , 0 = None
    courseCode: z.string().min(1, { error: 'Course code is required' }).max(20, { error: 'Course code is too long' }),
    courseName: z.string().min(1, { error: 'Course name is required' }).max(100, { error: 'Course name is too long' }),
    description: z.string().max(500).optional().or(z.literal('')),
})

/* public class CreateCourseRequest {
    [Required]
    public int? AcademicYear { get; set; }
[Required]
    public TeachingCourse.SemesterEnum Semester { get; set; }
[Required]
    public string ? CourseCode { get; set; }
[Required]
    public string ? CourseName { get; set; }
    public string ? Description { get; set; }
} */
export default function CourseCreateDialog({ open, onClose }) {

    const defaultValues = {
        academicYear: 2025,
        semester: 1, // 1 =Spring, 2=Winter, 3=Summer , 0 = None
        courseCode: '',
        courseName: '',
        description: ''
    }

    const methods = useForm({
        resolver: zodResolver(newCourseSchema),
        defaultValues,
        mode: 'onBlur',
    });

    const {
        handleSubmit,
        formState: { isSubmitting },
    } = methods;

    const onSubmit = handleSubmit(async (data) => {
        try {
            // call create course api
            var res = await ClassManagementActions.createCourse(data);
            console.log(res);
        } catch (error) {
            console.error(error);
        }
    });
    useEffect(() => {
        return () => {
            methods.reset();
        }
    }, [open])

    const renderForm = () => (

        <Stack spacing={3} sx={{ mt: 2 }} >
            <RHFTextField name="academicYear" label="Academic Year" type="number" />
            <RHFTextField name="semester" label="Semester" select>
                <MenuItem value="0">None</MenuItem>
                <MenuItem value="1">Spring</MenuItem>
                <MenuItem value="2">Winter</MenuItem>
                <MenuItem value="3">Summer</MenuItem>
            </RHFTextField>
            <RHFTextField name="courseCode" label="Course Code" />
            <RHFTextField name="courseName" label="Course Name" />
            <RHFTextField name="description" label="Description" multiline rows={4} />
        </Stack>

    );


    return <>

        <Dialog
            disableEscapeKeyDown
            open={open}

            fullWidth maxWidth="sm">
            <Form methods={methods} onSubmit={onSubmit}>
                <DialogTitle>
                    <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                        Create New Course
                        <IconButton onClick={onClose}>
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </Stack>

                </DialogTitle>
                <DialogContent>
                    {renderForm()}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={onClose}
                        color='error'>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"

                        loading={isSubmitting}
                        type='submit'>
                        Create
                    </Button>
                </DialogActions>
            </Form >
        </Dialog>

    </>

}