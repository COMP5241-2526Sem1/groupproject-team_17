import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function CourseDetailsStudentFormDialog({
  open,
  onClose,
  onSubmit,
  student = null,
  isLoading = false,
}) {
  const isEditMode = Boolean(student);

  const [formData, setFormData] = useState({
    studentId: '',
    fullName: '',
    email: '',
    pin: '',
  });

  const [errors, setErrors] = useState({});

  // Initialize form data when dialog opens or student changes
  useEffect(() => {
    if (isEditMode && student) {
      setFormData({
        studentId: student.studentId || '',
        fullName: student.fullName || student.name || '',
        email: student.email || '',
        pin: student.pin || student.PIN || '',
      });
    } else {
      setFormData({
        studentId: '',
        fullName: '',
        email: '',
        pin: '',
      });
    }
    setErrors({});
  }, [open, student, isEditMode]);

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.studentId.trim()) {
      newErrors.studentId = 'Student ID is required';
    }

    // Optional validation for email format if email is provided
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    // Prepare student data for submission
    const studentData = {
      studentId: formData.studentId.trim(),
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      pin: formData.pin.trim(),
    };

    onSubmit(studentData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="student-form-dialog-title"
    >
      <DialogTitle id="student-form-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Iconify
            icon={isEditMode ? "solar:pen-bold" : "solar:user-plus-bold"}
            sx={{ color: 'primary.main', width: 24, height: 24 }}
          />
          <Typography variant="h6" component="span">
            {isEditMode ? 'Edit Student' : 'Add New Student'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Grid sx={{
          mt: 2
        }} container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Student ID"
              value={formData.studentId}
              onChange={handleInputChange('studentId')}
              error={Boolean(errors.studentId)}
              helperText={errors.studentId}
              disabled={isEditMode || isLoading}
              required
              placeholder="e.g., 12345678"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Full Name"
              value={formData.fullName}
              onChange={handleInputChange('fullName')}
              error={Boolean(errors.fullName)}
              helperText={errors.fullName}
              disabled={isLoading}
              placeholder="e.g., John Doe (optional)"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={Boolean(errors.email)}
              helperText={errors.email}
              disabled={isLoading}
              placeholder="e.g., john.doe@university.edu (optional)"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="PIN"
              type="password"
              value={formData.pin}
              onChange={handleInputChange('pin')}
              error={Boolean(errors.pin)}
              helperText={errors.pin}
              disabled={isLoading}
              placeholder="Enter a PIN (optional)"
            />
          </Grid>
        </Grid>

        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Please fix the errors above before submitting.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading}
          startIcon={
            isLoading ? undefined : <Iconify icon={isEditMode ? "solar:pen-bold" : "solar:user-plus-bold"} />
          }
        >
          {isLoading ? 'Saving...' : (isEditMode ? 'Update Student' : 'Add Student')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
