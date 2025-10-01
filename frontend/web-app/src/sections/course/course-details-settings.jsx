import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';

import { paths } from 'src/routes/paths';

import { ClassManagementActions } from 'src/redux/actions/reducerActions';
import { useSelector } from 'src/redux/hooks';

import { useErrorDialog } from 'src/components/error-dialog';
import { Iconify } from 'src/components/iconify';

import CourseDetailsSettingsDeleteDialog from './course-details-delete-course-dialog';
import CourseDetailsSettingsEditDialog from './course-details-edit-course-dialog';

// ----------------------------------------------------------------------

export default function CourseDetailsSettings() {
  const router = useRouter();

  const errorDialog = useErrorDialog();

  const { selectedCourse } = useSelector((state) => state.classManagement);

  // Dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit dialog handlers
  const handleOpenEditDialog = () => {
    setShowEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setIsSubmitting(false);
  };

  const handleSubmitEdit = async (courseData) => {
    try {
      setIsSubmitting(true);

      // TODO: Here you would typically call an API to update the course
      // Example: await updateCourse(selectedCourse.id, courseData);
      console.log('Updating course with data:', courseData);

      // Close the dialog
      handleCloseEditDialog();

      // Show success message
      console.log(`Successfully updated course: ${courseData.courseCode}`);
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Error updating course. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete dialog handlers
  const handleOpenDeleteDialog = () => {
    setShowDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false);
  };

  const handleConfirmDelete = async () => {
    const res = await ClassManagementActions.deleteCourse(selectedCourse.id);
    if (res?.code !== 0) {
      await errorDialog.showResError(res, 'Failed to delete course. Please try again.');
    }
    setShowDeleteDialog(false);
    // Return to course list after deletion
    router.push(paths.dashboard.root);
  };

  // Disable dialog handlers
  const handleOpenDisableDialog = () => {
    setShowDisableDialog(true);
  };

  const handleCloseDisableDialog = () => {
    setShowDisableDialog(false);
  };

  const handleConfirmDisable = async () => {
    const res = await ClassManagementActions.updateCourse(selectedCourse.id, {
      isEnabled: selectedCourse.isEnabled ? false : true,
    });
    if (res?.code !== 0) {
      await errorDialog.showResError(res, 'Failed to disable course. Please try again.');
    }
    setShowDisableDialog(false);
  };

  // Archive dialog handlers
  const handleOpenArchiveDialog = () => {
    setShowArchiveDialog(true);
  };

  const handleCloseArchiveDialog = () => {
    setShowArchiveDialog(false);
  };

  const handleConfirmArchive = async () => {
    const res = await ClassManagementActions.updateCourse(selectedCourse.id, {
      isArchived: selectedCourse.isArchived ? false : true,
    });
    if (res?.code !== 0) {
      await errorDialog.showResError(res, 'Failed to archive course. Please try again.');
    }
    setShowArchiveDialog(false);
  };

  const formatSemester = (semester) => {
    const semesterMap = {
      0: 'None',
      1: 'Semester 1',
      2: 'Semester 2',
      3: 'Summer',
    };
    return semesterMap[semester] || 'Unknown';
  };

  const status = selectedCourse.isArchived
    ? 'Archived'
    : selectedCourse.isEnabled
      ? 'Active'
      : 'Inactive';
  const statusColor = selectedCourse.isArchived
    ? 'warning.main'
    : selectedCourse.isEnabled
      ? 'success.main'
      : 'error.main';
  const renderCourseInfo = () => (
    <Card>
      <CardHeader
        title="Course Information"
        action={
          <Tooltip title="Edit Course">
            <IconButton onClick={handleOpenEditDialog}>
              <Iconify icon="solar:pen-bold" />
            </IconButton>
          </Tooltip>
        }
        sx={{ pb: 2 }}
      />
      <Divider />
      <CardContent>
        <Grid container spacing={3}>
          <Grid sizes={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Course Code
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {selectedCourse.courseCode || 'N/A'}
            </Typography>
          </Grid>

          <Grid sizes={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Course Name
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {selectedCourse.courseName || 'N/A'}
            </Typography>
          </Grid>

          <Grid sizes={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Academic Year
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {selectedCourse.academicYear || 'N/A'}
            </Typography>
          </Grid>

          <Grid sizes={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Semester
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {formatSemester(selectedCourse.semester)}
            </Typography>
          </Grid>

          <Grid sizes={{ xs: 12 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Description
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {selectedCourse.description || 'No description provided'}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderStatistics = () => (
    <Card>
      <CardHeader sx={{ pb: 2 }} title="Course Statistics" />
      <Divider />
      <CardContent>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary">
                {selectedCourse.studentCount || 0}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Enrolled Students
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary">
                {selectedCourse.classCount || 0}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Classes
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color={statusColor}>
                {status}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderDangerZone = () => (
    <Card sx={{ borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
      <CardHeader
        sx={{ pb: 2 }}
        title="Danger Zone"
        titleTypographyProps={{ color: 'error.main' }}
      />
      <Divider />
      <CardContent>
        <Stack spacing={3}>
          {/* Disable Course */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Disable Course
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Disabling a course will make it inactive but preserve all data. Students won&apos;t be
              able to access the course, but it can be re-enabled later.
            </Typography>
            <Button
              variant="outlined"
              color={selectedCourse?.isEnabled ? 'error' : 'success'}
              startIcon={<Iconify icon="solar:eye-closed-bold" />}
              onClick={handleOpenDisableDialog}
            >
              {selectedCourse?.isEnabled ? 'Disable Course' : 'Enabled Course'}
            </Button>
          </Box>

          {/* Archive Course */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Archive Course
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Archiving a course will move it to the archived section. All data is preserved but the
              course becomes read-only and is hidden from active views.
            </Typography>
            <Button
              variant="outlined"
              color={!selectedCourse?.isArchived ? 'warning' : 'success'}
              startIcon={<Iconify icon="solar:archive-bold" />}
              onClick={handleOpenArchiveDialog}
            >
              {selectedCourse?.isArchived ? 'Unarchive Course' : 'Archive Course'}
            </Button>
          </Box>

          {/* Delete Course */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Delete Course
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Once you delete a course, all associated data including students, classes, and
              activities will be permanently removed. This action cannot be undone.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
              onClick={handleOpenDeleteDialog}
            >
              Delete Course
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  if (!selectedCourse) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            No course selected. Please select a course to view settings.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Course Information Card */}
      {renderCourseInfo()}

      {/* Course Statistics Card */}
      {renderStatistics()}

      {/* Danger Zone Card */}
      {renderDangerZone()}

      {/* Edit Course Dialog */}
      <CourseDetailsSettingsEditDialog
        open={showEditDialog}
        onClose={handleCloseEditDialog}
        onSubmit={handleSubmitEdit}
        course={selectedCourse}
        isLoading={isSubmitting}
      />

      {/* Delete Course Dialog */}
      <CourseDetailsSettingsDeleteDialog
        open={showDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        course={selectedCourse}
      />

      {/* Disable Course Dialog */}
      <Dialog open={showDisableDialog} onClose={handleCloseDisableDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedCourse?.isEnabled ? 'Disable Course' : 'Enable Course'}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to {selectedCourse?.isEnabled ? 'disable' : 'enable'} &quot;
            {selectedCourse?.courseCode}&quot;?
          </Typography>
          {selectedCourse?.isEnabled ? (
            <Alert severity="error">
              {
                "Disabling course will make it inactive. Students won't be able to access the course, but you can re-enable it later if needed."
              }
            </Alert>
          ) : (
            <Alert severity="success">
              Enabling course will restore student access to the course.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDisableDialog}>Cancel</Button>
          <Button
            onClick={handleConfirmDisable}
            variant="contained"
            color={selectedCourse?.isEnabled ? 'error' : 'success'}
            startIcon={
              selectedCourse?.isEnabled ? (
                <Iconify icon="solar:eye-closed-bold" />
              ) : (
                <Iconify icon="solar:eye-bold" />
              )
            }
          >
            {selectedCourse?.isEnabled ? 'Disable Course' : 'Enable Course'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive Course Dialog */}
      <Dialog open={showArchiveDialog} onClose={handleCloseArchiveDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedCourse?.isArchived ? 'Unarchive Course' : 'Archive Course'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {`Are you sure you want to ${selectedCourse?.isArchived ? 'unarchive' : 'archive'} "${selectedCourse?.courseCode}"?`}
          </Typography>
          {selectedCourse?.isArchived ? (
            <Alert severity="success">Unarchiving course will restore it to active views.</Alert>
          ) : (
            <Alert severity="warning">
              Archiving course will make it read-only and hidden from active views.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseArchiveDialog}>Cancel</Button>
          <Button
            onClick={handleConfirmArchive}
            variant="contained"
            color={!selectedCourse?.isArchived ? 'warning' : 'success'}
            startIcon={<Iconify icon="solar:archive-bold" />}
          >
            {selectedCourse?.isArchived ? 'Unarchive Course' : 'Archive Course'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
