import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
} from '@mui/material';

import { ClassManagementActions } from 'src/redux/actions/reducerActions';

import { Form, RHFTextField } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

// if semester is not a number, show error
const newCourseSchema = z.object({
  academicYear: z.number().min(1970).max(2100),
  semester: z.number().min(0).max(3), // 1 =Spring, 2=Winter, 3=Summer , 0 = None
  courseCode: z
    .string()
    .min(1, { error: 'Course code is required' })
    .max(20, { error: 'Course code is too long' }),
  courseName: z
    .string()
    .min(1, { error: 'Course name is required' })
    .max(100, { error: 'Course name is too long' }),
  description: z.string().max(500).optional().or(z.literal('')),
});

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
  const [error, setError] = useState(null);

  const defaultValues = {
    academicYear: 2025,
    semester: 1, // 1 =Spring, 2=Winter, 3=Summer , 0 = None
    courseCode: '',
    courseName: '',
    description: '',
  };

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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // call create course api
      var res = await ClassManagementActions.createCourse(data);
      if (res.code !== 0) {
        setError(res.message ?? 'Something went wrong');
      } else {
        onClose();
      }
    } catch {
      setError('Failed to create course. Please try again.');
    }
  });
  useEffect(
    () => () => {
      methods.reset();
      setError(null);
    },
    [open, methods]
  );

  const renderForm = () => (
    <Stack spacing={3} sx={{ mt: 2 }}>
      <RHFTextField name="academicYear" label="Academic Year" type="number" />
      <RHFTextField name="semester" label="Semester" select>
        <MenuItem value="0">All</MenuItem>
        <MenuItem value="1">1</MenuItem>
        <MenuItem value="2">2</MenuItem>
        <MenuItem value="3">3</MenuItem>
      </RHFTextField>
      <RHFTextField name="courseCode" label="Course Code" />
      <RHFTextField name="courseName" label="Course Name" />
      <RHFTextField name="description" label="Description" multiline rows={4} />
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting && error == null) {
          onClose();
        }
      }}
      fullWidth
      maxWidth="sm"
    >
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            Create New Course
            <IconButton disabled={isSubmitting} onClick={onClose}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info">
            Please ensure the course code is unique when creating a new course.
          </Alert>
          {renderForm()}
          {error && (
            <Alert sx={{ mt: 2 }} severity="error">
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={isSubmitting} onClick={onClose} color="error">
            Cancel
          </Button>
          <Button variant="contained" loading={isSubmitting} type="submit">
            Create
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
