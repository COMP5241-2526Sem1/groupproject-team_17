import * as z from 'zod';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Alert,
  Stack,
  Button,
  Dialog,
  MenuItem,
  IconButton,
  DialogTitle,
  DialogActions,
  DialogContent,
} from '@mui/material';

import { ClassManagementActions } from 'src/redux/actions/reducerActions';

import { Iconify } from 'src/components/iconify';
import { useErrorDialog } from 'src/components/error-dialog';
import { Form, RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

// Validation schema
const editCourseSchema = z.object({
  courseCode: z
    .string()
    .min(1, { message: 'Course code is required' })
    .max(20, { message: 'Course code is too long' }),
  courseName: z
    .string()
    .min(1, { message: 'Course name is required' })
    .max(100, { message: 'Course name is too long' }),
  academicYear: z.number().min(1970).max(2100),
  semester: z.string(), // 0=None, 1=Spring, 2=Winter, 3=Summer
  description: z.string().max(500).optional().or(z.literal('')),
});

const SEMESTER_OPTIONS = [
  { value: 'none', label: 'All' },
  { value: 'one', label: '1' },
  { value: 'two', label: '2' },
  { value: 'summer', label: '3' },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function CourseDetailsSettingsEditDialog({
  open,
  onClose,
  onSubmit,
  course = null,
  isLoading = false,
}) {
  const errorDialog = useErrorDialog();
  const [submitError, setSubmitError] = useState('');

  const defaultValues = {
    courseCode: '',
    courseName: '',
    academicYear: CURRENT_YEAR,
    semester: '',
    description: '',
  };

  const methods = useForm({
    resolver: zodResolver(editCourseSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;

  // Initialize form data when dialog opens or course changes
  useEffect(() => {
    if (open && course) {
      reset({
        courseCode: course.courseCode || '',
        courseName: course.courseName || '',
        academicYear: course.academicYear || CURRENT_YEAR,
        semester: semesterConvert(course.semester) ?? 1,
        description: course.description || '',
      });
      setSubmitError('');
    }
  }, [open, course, reset]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      setSubmitError('');
    }
  }, [open, reset]);

  // Focus management for accessibility
  useEffect(() => {
    if (open && !isSubmitting && !isLoading) {
      // Ensure dialog content is properly focused and not hidden
      const dialogElement = document.querySelector('[role="dialog"]');
      if (dialogElement) {
        dialogElement.removeAttribute('aria-hidden');
      }
    }
  }, [open, isSubmitting, isLoading]);


  const semesterConvert = (sem) => {
    if (sem === 'one') return 'one';
    if (sem === 'two') return 'two';
    if (sem === 'summer') return 'summer';
    return 'none';
  }
  const onSubmitForm = handleSubmit(async (data) => {
    const res = await ClassManagementActions.updateCourse(course.id, data);

    if (res?.code !== 0) {
      errorDialog.showResError(res, 'Failed to update course. Please try again.');
      return;
    }
    onClose();
  });

  const handleClose = () => {
    if (!isSubmitting && !isLoading) {
      onClose();
    }
  };

  const renderForm = () => (
    <Stack spacing={3} sx={{ pt: 1 }}>
      {submitError && <Alert severity="error">{submitError}</Alert>}

      <RHFTextField
        name="courseCode"
        label="Course Code"
        helperText="e.g., COMP5241"
        disabled={isSubmitting || isLoading}
        autoFocus
      />

      <RHFTextField
        name="courseName"
        label="Course Name"
        helperText="e.g., Advanced Programming Techniques"
        disabled={isSubmitting || isLoading}
      />

      <RHFTextField
        name="academicYear"
        label="Academic Year"
        type="number"
        disabled={isSubmitting || isLoading}
      />

      <RHFTextField name="semester" label="Semester" select disabled={isSubmitting || isLoading}>
        {SEMESTER_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </RHFTextField>

      <RHFTextField
        name="description"
        label="Description"
        helperText="Optional course description"
        disabled={isSubmitting || isLoading}
        multiline
        rows={4}
      />
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="edit-course-dialog-title"
      aria-describedby="edit-course-dialog-description"
      disableEnforceFocus={isSubmitting || isLoading}
      disableAutoFocus={false}
      disableRestoreFocus={false}
      keepMounted={false}
      PaperProps={{
        sx: {
          minHeight: 500,
          // Ensure dialog content is not hidden from assistive technology
          '&:focus-visible': {
            outline: 'none',
          },
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            // Prevent backdrop from interfering with focus management
            pointerEvents: isSubmitting || isLoading ? 'none' : 'auto',
          },
        },
      }}
      BackdropProps={{
        // Prevent backdrop from blocking assistive technology
        'aria-hidden': 'false',
      }}
    >
      <Form methods={methods} onSubmit={onSubmitForm}>
        <DialogTitle id="edit-course-dialog-title">
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
            Edit Course Information
            <IconButton
              disabled={isSubmitting || isLoading}
              onClick={handleClose}
              aria-label="Close dialog"
              tabIndex={isSubmitting || isLoading ? -1 : 0}
              sx={{
                // Ensure button is visible to assistive technology
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: '2px',
                },
                // Prevent the button from being hidden when disabled
                '&.Mui-disabled': {
                  pointerEvents: 'none',
                  opacity: 0.5,
                },
              }}
            >
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent id="edit-course-dialog-description">{renderForm()}</DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
            tabIndex={isSubmitting || isLoading ? -1 : 0}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            type="submit"
            loading={isSubmitting || isLoading}
            tabIndex={isSubmitting || isLoading ? -1 : 0}
            aria-label="Update course information"
          >
            Update Course
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

CourseDetailsSettingsEditDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
  course: PropTypes.object,
  isLoading: PropTypes.bool,
};
