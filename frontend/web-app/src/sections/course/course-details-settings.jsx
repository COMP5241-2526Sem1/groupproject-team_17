import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

import { activityAPI } from 'src/api/api-function-call';
import { ClassManagementActions } from 'src/redux/actions/reducerActions';
import { useSelector } from 'src/redux/hooks';

import { useErrorDialog } from 'src/components/error-dialog';
import { Iconify } from 'src/components/iconify';
import { Label } from 'src/components/label';

import CourseDetailsSettingsDeleteDialog from './course-details-delete-course-dialog';
import CourseDetailsSettingsEditDialog from './course-details-edit-course-dialog';

// ----------------------------------------------------------------------

// Helper function to parse string mode to enum value
const parseJoinCheckingMode = (modeString) => {
  if (typeof modeString === 'number') {
    return modeString; // Already a number, return as-is
  }

  if (!modeString || typeof modeString !== 'string') {
    return 0; // Invalid input, return Disabled
  }

  let result = 0;
  const modeParts = modeString.split(',').map(s => s.trim().toLowerCase());

  modeParts.forEach(part => {
    switch (part) {
      case 'studentid':
        // eslint-disable-next-line no-bitwise
        result |= 1;
        break;
      case 'studentname':
        // eslint-disable-next-line no-bitwise
        result |= 2;
        break;
      case 'email':
        // eslint-disable-next-line no-bitwise
        result |= 4;
        break;
      case 'pin':
        // eslint-disable-next-line no-bitwise
        result |= 8;
        break;
      default:
        break;
    }
  });

  return result;
};

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

  // Activities count state
  const [activityCount, setActivityCount] = useState(0);

  // Join mode states (moved from renderCourseJoinInfo)
  const [editingJoinMode, setEditingJoinMode] = useState(false);
  const [currentCombination, setCurrentCombination] = useState(1);
  const [savedCombinations, setSavedCombinations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch activities count
  useEffect(() => {
    const fetchActivitiesCount = async () => {
      if (!selectedCourse?.id) return;

      try {
        const res = await activityAPI.getCourseActivities(selectedCourse.id);
        if (res?.code === 0 && res.data) {
          setActivityCount(res.data.length);
        }
      } catch (error) {
        console.error('Failed to fetch activities count:', error);
      }
    };

    fetchActivitiesCount();
  }, [selectedCourse?.id]);

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
      'one': 'Semester 1',
      'two': 'Semester 2',
      'summer': 'Semester 3',
    };
    return semesterMap[semester] || '';
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

  const renderCourseJoinInfo = () => {
    const handleStartEdit = () => {
      const rawModes = selectedCourse.joinCheckingModes || ['0'];
      // Convert string modes to numeric enum values
      const parsedModes = rawModes.map(mode => parseJoinCheckingMode(mode));
      console.log('[Course Settings] Starting edit:', {
        rawModes,
        parsedModes
      });
      setSavedCombinations(parsedModes);
      setCurrentCombination(1); // Always start with Student ID
      setEditingJoinMode(true);
    };

    const joinCheckingModes = [
      { value: 1, label: 'Student ID', icon: 'solar:user-id-bold', color: 'primary' },
      { value: 2, label: 'Student Name', icon: 'solar:user-bold', color: 'info' },
      { value: 4, label: 'Email', icon: 'solar:letter-bold', color: 'success' },
      { value: 8, label: 'PIN', icon: 'solar:key-bold', color: 'warning' },
    ];

    // eslint-disable-next-line no-bitwise
    const hasFlag = (mode, flag) => (mode & flag) === flag;

    const toggleFlag = (flag) => {
      // Prevent deselecting Student ID (value 1)
      if (flag === 1) {
        return; // Student ID is mandatory, cannot be toggled off
      }
      // eslint-disable-next-line no-bitwise
      setCurrentCombination((prev) => prev ^ flag);
    };

    const addCombination = () => {
      if (currentCombination > 0) {
        const filtered = savedCombinations.filter((c) => c !== 0);
        if (!filtered.includes(currentCombination)) {
          setSavedCombinations([...filtered, currentCombination]);
        }
        setCurrentCombination(1); // Reset to Student ID only
      }
    };

    const removeCombination = (combination) => {
      const filtered = savedCombinations.filter((c) => c !== combination);
      setSavedCombinations(filtered.length > 0 ? filtered : [0]);
    };

    const clearAll = () => {
      setSavedCombinations([0]);
      setCurrentCombination(1); // Reset to Student ID only
    };

    const handleSaveJoinMode = async () => {
      setIsSaving(true);
      try {
        const res = await ClassManagementActions.updateCourse(selectedCourse.id, {
          joinCheckingModes: savedCombinations,
        });
        if (res?.code !== 0) {
          await errorDialog.showResError(
            res,
            'Failed to update join checking mode. Please try again.'
          );
        } else {
          setEditingJoinMode(false);
        }
      } finally {
        setIsSaving(false);
      }
    };

    const handleCancelEdit = () => {
      const rawModes = selectedCourse.joinCheckingModes || ['0'];
      const parsedModes = rawModes.map(mode => parseJoinCheckingMode(mode));
      setCurrentCombination(1); // Reset to Student ID only
      setSavedCombinations(parsedModes);
      setEditingJoinMode(false);
    };


    const getJoinModeDisplay = (modesArray) => {
      // Convert string modes to numeric values if needed
      const parsedModes = modesArray ? modesArray.map(mode => parseJoinCheckingMode(mode)) : [0];

      console.log('[Course Settings] Displaying modes:', {
        original: modesArray,
        parsed: parsedModes
      });

      if (
        !parsedModes ||
        parsedModes.length === 0 ||
        (parsedModes.length === 1 && parsedModes[0] === 0)
      ) {
        return (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            <Typography sx={{ pt: 0.5 }} variant="subtitle2" >
              <Iconify icon="solar:lock-keyhole-bold" width={20} />
            </Typography>
            <Typography variant="body2" color="error">
              No verification required
            </Typography>
          </Box>
        );
      }

      return (
        <Stack spacing={1.5}>
          {parsedModes.map((combination, comboIndex) => {
            if (combination === 0) return null;
            const modes = joinCheckingModes.filter((m) => hasFlag(combination, m.value));
            return (
              <Box
                key={`combo-${combination}-${comboIndex}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
                  p: 1.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.neutral',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                  Option {comboIndex + 1}:
                </Typography>
                {modes.map((m, mIndex) => (
                  <Box key={m.value} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Label color={m.color} variant="soft">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Iconify icon={m.icon} width={16} />
                        {m.label}
                      </Box>
                    </Label>
                    {mIndex < modes.length - 1 && (
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                        +
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            );
          })}
        </Stack>
      );
    };

    return (
      <Card>
        <CardHeader
          sx={{ pb: 2.5 }}
          title="Course Join Information"
          action={
            !editingJoinMode && (
              <Tooltip title="Edit Join Settings">
                <IconButton onClick={handleStartEdit}>
                  <Iconify icon="solar:pen-bold" />
                </IconButton>
              </Tooltip>
            )
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Class Id
                </Typography>
                <Typography variant="h3" sx={{ mb: 2 }} color="error">
                  {selectedCourse.joinCode || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Students will need this Class Id to join the course.
                </Typography>
              </Box>
            </Grid>
            {/*  divider will appear when the width is smaller than md */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Divider sx={{ display: { xs: 'block', md: 'none' }, my: 2 }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Join Verification Mode
                </Typography>
                {!editingJoinMode ? (
                  <Box sx={{ mb: 2 }}>
                    {getJoinModeDisplay(selectedCourse.joinCheckingModes)}
                  </Box>
                ) : (
                  <Box sx={{ width: '100%' }}>
                    {/* Instructions */}
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        How to set verification combinations:
                      </Typography>
                      <Typography variant="body2" component="div">
                        1. Select fields below to create a combination
                        <br />
                        2. Click "Add Combination" to save it
                        <br />
                        3. Repeat to add more options (e.g., "ID+Email" OR "ID+PIN")
                        <br />
                        4. Students can join using ANY saved combination
                      </Typography>
                    </Alert>

                    {/* Saved Combinations Section */}
                    {savedCombinations.length > 0 && savedCombinations[0] !== 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 2,
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Iconify icon="solar:check-circle-bold" color="success.main" />
                            Saved Verification Options
                          </Typography>
                          <Button
                            size="small"
                            color="error"
                            variant="text"
                            onClick={clearAll}
                            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                          >
                            Clear All
                          </Button>
                        </Box>
                        <Stack spacing={1.5}>
                          {savedCombinations.map((combination, index) => {
                            if (combination === 0) return null;
                            const modes = joinCheckingModes.filter((m) =>
                              hasFlag(combination, m.value)
                            );
                            return (
                              <Box
                                key={`saved-${combination}-${index}`}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  p: 2,
                                  borderRadius: 2,
                                  border: 2,
                                  borderColor: 'success.main',
                                  bgcolor: 'success.lighter',
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                                    Option {index + 1}:
                                  </Typography>
                                  {modes.map((m, mIndex) => (
                                    <Box key={m.value} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Label color={m.color} variant="filled">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <Iconify icon={m.icon} width={16} />
                                          {m.label}
                                        </Box>
                                      </Label>
                                      {mIndex < modes.length - 1 && (
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', mx: 0.5 }}>
                                          +
                                        </Typography>
                                      )}
                                    </Box>
                                  ))}
                                </Box>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => removeCombination(combination)}
                                  sx={{ ml: 2 }}
                                >
                                  <Iconify icon="solar:trash-bin-trash-bold" />
                                </IconButton>
                              </Box>
                            );
                          })}
                        </Stack>
                      </Box>
                    )}

                    <Divider sx={{ my: 3 }} />

                    {/* Combination Builder Section */}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                        <Iconify icon="solar:add-circle-bold" sx={{ mr: 1 }} />
                        Build New Combination
                      </Typography>

                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Student ID is required</strong> for all verification combinations.
                        </Typography>
                      </Alert>

                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        {joinCheckingModes.map((mode) => (
                          <Grid key={mode.value} size={{ xs: 12, sm: 6 }}>
                            <Box
                              onClick={() => toggleFlag(mode.value)}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                p: 2,
                                borderRadius: 2,
                                border: 2,
                                borderColor: hasFlag(currentCombination, mode.value)
                                  ? `${mode.color}.main`
                                  : 'divider',
                                bgcolor: hasFlag(currentCombination, mode.value)
                                  ? `${mode.color}.lighter`
                                  : 'background.paper',
                                cursor: mode.value === 1 ? 'not-allowed' : 'pointer', // Student ID cannot be clicked
                                opacity: mode.value === 1 ? 0.7 : 1, // Slightly dimmed for required field
                                transition: 'all 0.2s',
                                '&:hover': mode.value === 1 ? {} : {
                                  borderColor: `${mode.color}.main`,
                                  bgcolor: `${mode.color}.lighter`,
                                  transform: 'translateY(-2px)',
                                  boxShadow: 2,
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: hasFlag(currentCombination, mode.value)
                                    ? `${mode.color}.main`
                                    : 'action.hover',
                                  color: hasFlag(currentCombination, mode.value) ? 'white' : 'text.secondary',
                                  mr: 2,
                                }}
                              >
                                <Iconify
                                  icon={
                                    hasFlag(currentCombination, mode.value)
                                      ? 'solar:check-circle-bold'
                                      : mode.icon
                                  }
                                  width={24}
                                />
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2">
                                  {mode.label}
                                  {mode.value === 1 && (
                                    <Label color="error" variant="soft" sx={{ ml: 1 }}>
                                      Required
                                    </Label>
                                  )}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>

                      {/* Current Combination Preview */}

                      {currentCombination >= 1 && (
                        <Button
                          variant="contained"
                          color="success"
                          onClick={addCombination}
                          startIcon={<Iconify icon="solar:add-circle-bold" />}
                        >
                          Add Combination
                        </Button>
                      )}

                    </Box>
                    <Divider sx={{ my: 3 }} />
                    {/* Action Buttons */}
                    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>

                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveJoinMode}
                        startIcon={<Iconify icon="solar:diskette-bold" />}
                        disabled={isSaving}
                        loading={isSaving}
                      >
                        Save All
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={handleCancelEdit}
                        startIcon={<Iconify icon="solar:close-circle-bold" />}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </Stack>
                  </Box>
                )}
                {!editingJoinMode ? <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {savedCombinations.length > 0 ? `Students will need to provide one of the above verification combinations when
                  joining the course.` : 'Students can join the course without any verification.'}
                </Typography> : null}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

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
                {activityCount}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Activities
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
          {/*           <Box>
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
          </Box> */}

          {/* Archive Course */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Archive Course
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Archiving a course will move it to the archived section. All data is preserved. This action can let
              you have clear view of active courses.
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
      {/* Course Join Information Card */}
      {renderCourseJoinInfo()}
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
              Disabling course will make it inactive. Students won&apos;t be able to access the course, but you can re-enable it later if needed.
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
              Archiving course will make it hidden from active views.
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
