import { useSetState } from 'minimal-shared/hooks';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  Tooltip,
  Typography,
} from '@mui/material';

import { ClassManagementActions } from 'src/redux/actions/reducerActions';
import { useSelector } from 'src/redux/hooks';

import { Iconify } from 'src/components/iconify';
import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';
import {
  emptyRows,
  TableEmptyRows,
  TableHeadCustom,
  TableNoData,
  TablePaginationCustom,
  TableSelectedAction,
  useTable,
} from 'src/components/table';

import CourseDetailsDeleteDialog from './course-details-delete-student-dialog';
import CourseDetailsImportDialog from './course-details-import-dialog';
import CourseDetailsStudentFormDialog from './course-details-students-form-dialog';
import StudentTableRow from './course-details-students-table-row';
import CourseDetailsStudentsTableToolbar from './course-details-students-table-toolbar';

// ----------------------------------------------------------------------

// Join checking mode definitions
const joinCheckingModes = [
  { value: 1, label: 'Student ID', icon: 'solar:user-id-bold', color: 'primary' },
  { value: 2, label: 'Student Name', icon: 'solar:user-bold', color: 'info' },
  { value: 4, label: 'Email', icon: 'solar:letter-bold', color: 'warning' },
  { value: 8, label: 'PIN', icon: 'solar:lock-password-bold', color: 'error' },
];

// Helper function to parse string mode to enum value
const parseJoinCheckingMode = (modeString) => {
  if (typeof modeString === 'number') {
    return modeString;
  }
  if (!modeString || typeof modeString !== 'string') {
    return 0;
  }
  let result = 0;
  const modeParts = modeString.split(',').map(s => s.trim().toLowerCase());
  modeParts.forEach(part => {
    switch (part) {
      case 'studentid':
        result |= 1;
        break;
      case 'studentname':
        result |= 2;
        break;
      case 'email':
        result |= 4;
        break;
      case 'pin':
        result |= 8;
        break;
      default:
        break;
    }
  });
  return result;
};

const TABLE_HEAD = [
  { id: 'studentId', label: 'Student ID' },
  { id: 'fullname', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'pin', label: 'PIN' },
  { id: '', width: 88 },
];

// ----------------------------------------------------------------------

export default function CourseDetailsStudents() {
  const { selectedCourse } = useSelector((state) => state.classManagement);
  const students = selectedCourse?.students || [];
  const filters = useSetState({ name: '' });
  const table = useTable({
    defaultOrderBy: 'studentId',
  });
  const previousFilterRef = useRef(filters.state.name);

  // Import dialog state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResult, setImportResult] = useState({
    success: false,
    importedStudents: [],
    importedCount: 0,
    ignoredCount: 0,
    errors: [],
    errorMessage: '',
  });

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [studentsToDelete, setStudentsToDelete] = useState([]);
  const [isMultipleDelete, setIsMultipleDelete] = useState(false);

  // Student form dialog state
  const [showStudentFormDialog, setShowStudentFormDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Verification settings state
  const [editingJoinMode, setEditingJoinMode] = useState(false);
  const [currentCombination, setCurrentCombination] = useState(1);
  const [savedCombinations, setSavedCombinations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize saved combinations from course data
  useEffect(() => {
    if (selectedCourse?.joinCheckingModes) {
      const parsedModes = selectedCourse.joinCheckingModes.map(mode => parseJoinCheckingMode(mode));
      setSavedCombinations(parsedModes.filter(mode => mode > 0));
    }
  }, [selectedCourse?.joinCheckingModes]);

  // Verification helper functions
  const hasFlag = (combination, flag) => (combination & flag) === flag;

  const toggleFlag = (flag) => {
    if (flag === 1) return; // Student ID is always required
    setCurrentCombination(prev => prev ^ flag);
  };

  const addCombination = () => {
    if (currentCombination > 1 && !savedCombinations.includes(currentCombination)) {
      setSavedCombinations([...savedCombinations, currentCombination]);
      setCurrentCombination(1);
    }
  };

  const removeCombination = (combination) => {
    setSavedCombinations(savedCombinations.filter(c => c !== combination));
  };

  const clearAll = () => {
    setSavedCombinations([]);
    setCurrentCombination(1);
  };

  const handleStartEdit = () => {
    setEditingJoinMode(true);
  };

  const handleCancelEdit = () => {
    setEditingJoinMode(false);
    setCurrentCombination(1);
    // Reset to original values
    if (selectedCourse?.joinCheckingModes) {
      const parsedModes = selectedCourse.joinCheckingModes.map(mode => parseJoinCheckingMode(mode));
      setSavedCombinations(parsedModes.filter(mode => mode > 0));
    }
  };

  const handleRefreshStudents = async () => {
    try {
      await ClassManagementActions.getCourseDetails(selectedCourse.id);
    } catch (error) {
      console.error('Error refreshing students:', error);
    }
  };

  const handleSaveJoinMode = async () => {
    try {
      setIsSaving(true);
      const modesToSave = savedCombinations.length > 0 ? savedCombinations : [0];

      const res = await ClassManagementActions.updateCourse(selectedCourse.id, {
        joinCheckingModes: modesToSave,
      });

      if (res?.code === 0) {
        setEditingJoinMode(false);
        await ClassManagementActions.getCourseDetails(selectedCourse.id);
      } else {
        console.error('Failed to save join mode:', res);
      }
    } catch (error) {
      console.error('Error saving join mode:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getJoinModeDisplay = (modesArray) => {
    const parsedModes = modesArray ? modesArray.map(mode => parseJoinCheckingMode(mode)) : [0];

    if (!parsedModes || parsedModes.length === 0 || (parsedModes.length === 1 && parsedModes[0] === 0)) {
      return (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography sx={{ pt: 0.5 }} variant="subtitle2">
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

  // Apply filter and sort function
  const dataFiltered = useMemo(() => {
    const searchTerm = filters.state.name.toLowerCase().trim();

    // First, filter the data and create a copy to avoid mutating the original
    let filteredStudents = students;
    if (searchTerm) {
      filteredStudents = students.filter((student) => {
        const matchesStudentId = student.studentId?.toLowerCase()?.includes(searchTerm) || false;
        const matchesFullName =
          (student.fullname || student.name)?.toLowerCase()?.includes(searchTerm) || false;
        const matchesEmail = student.email?.toLowerCase()?.includes(searchTerm) || false;
        return matchesStudentId || matchesFullName || matchesEmail;
      });
    }

    // Create a copy of the filtered array before sorting to avoid mutating the original
    filteredStudents = [...filteredStudents];

    // Then, sort the copied filtered data
    if (table.orderBy) {
      filteredStudents.sort((a, b) => {
        let aValue = a[table.orderBy];
        let bValue = b[table.orderBy];

        // Handle fullname mapping
        if (table.orderBy === 'fullname') {
          aValue = a.fullname || a.name || '';
          bValue = b.fullname || b.name || '';
        }

        // Convert to string for consistent comparison
        aValue = String(aValue || '');
        bValue = String(bValue || '');

        if (aValue < bValue) {
          return table.order === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return table.order === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredStudents;
  }, [students, filters.state.name, table.order, table.orderBy]);

  const notFound = dataFiltered.length === 0;

  const handleDeleteRow = (id) => {
    // Find the student to delete
    const studentToDelete = students.find((student) => {
      const studentKey = student.id || student.studentId || '';
      return studentKey === id;
    });

    if (studentToDelete) {
      setStudentsToDelete([studentToDelete]);
      setIsMultipleDelete(false);
      setShowDeleteDialog(true);
    }
  };

  const handleDeleteRows = async (ids) => {
    // Find all students to delete
    const studentsToDeleteList = students.filter((student) => {
      const studentKey = student.id || student.studentId || '';
      return ids.includes(studentKey);
    });

    if (studentsToDeleteList.length > 0) {
      setStudentsToDelete(studentsToDeleteList);
      setIsMultipleDelete(true);
      setShowDeleteDialog(true);
    }
  };

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false);
    setStudentsToDelete([]);
    setIsMultipleDelete(false);
  };

  const handleConfirmDelete = async () => {
    try {
      const studentIds = studentsToDelete.map((student) => student.id || student.studentId);
      console.log('Confirming deletion of students:', studentIds);

      // Clear the selection after successful deletion
      table.onSelectAllRows(false, []);
      // go back to first page if the current page is out of range after deletion
      if (
        table.page + 1 > Math.ceil((dataFiltered.length - studentIds.length) / table.rowsPerPage) &&
        table.page > 0
      ) {
        table.onChangePage(table.page - 1);
      }
      // Close the dialog
      handleCloseDeleteDialog();

      // You might want to update local state or refetch data here
      // For now, just show a success message
      console.log(`Successfully deleted ${studentsToDelete.length} student(s)`);
    } catch (error) {
      console.error('Error deleting students:', error);
      alert('Error deleting students. Please try again.');
    }
  };

  // Student form dialog handlers
  const handleAddStudent = () => {
    setEditingStudent(null);
    setShowStudentFormDialog(true);
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setShowStudentFormDialog(true);
  };

  const handleCloseStudentFormDialog = () => {
    setShowStudentFormDialog(false);
    setEditingStudent(null);
    setIsSubmittingStudent(false);
  };

  const handleSubmitStudent = async (studentData) => {
    try {
      setIsSubmittingStudent(true);

      // TODO: Here you would typically call an API to add/update the student
      // Example: await addOrUpdateStudents(courseId, [studentData]);
      var res = await ClassManagementActions.uploadStudents(selectedCourse?.id, [studentData]);
      //  console.log('Submitting student data:', studentData);
      if (res?.code == 0) {
        ClassManagementActions.getCourseDetails(selectedCourse?.id);
      }
      // Close the dialog
      handleCloseStudentFormDialog();

      // You might want to update local state or refetch data here
      // For now, just show a success message
      const action = editingStudent ? 'updated' : 'added';
      console.log(`Successfully ${action} student: ${studentData.studentId}`);
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Error saving student. Please try again.');
    } finally {
      setIsSubmittingStudent(false);
    }
  };
  // Clear selected items when filter changes - using ref to prevent infinite loop
  useEffect(() => {
    if (previousFilterRef.current !== filters.state.name) {
      if (table.selected.length > 0) {
        table.onSelectAllRows(false, []);
      }
      previousFilterRef.current = filters.state.name;
    }
  }, [filters.state.name, table.selected.length, table.onSelectAllRows]);

  const handleResetFilters = () => {
    filters.setState({ name: '' });
  };

  const handleImportCSV = (result) => {
    // result contains either success data or error information
    if (result.success) {
      // Successful import with processed students
      const processedStudents = result.students.map((student, index) => ({
        ...student,
        id: student.id || `imported_${Date.now()}_${index}`,
        PIN: student.pin || student.PIN || '', // Handle both 'pin' and 'PIN' cases
      }));

      // console.log('Processed imported students:', processedStudents);

      setImportResult({
        success: true,
        importedStudents: processedStudents,
        importedCount: processedStudents.length,
        ignoredCount: result.ignoredCount || 0,
        errors: result.errors || [],
        errorMessage: '',
      });
    } else {
      // Import failed
      setImportResult({
        success: false,
        importedStudents: [],
        importedCount: 0,
        ignoredCount: 0,
        errors: [],
        errorMessage: result.errorMessage || 'Unknown error occurred',
      });
    }

    setShowImportDialog(true);
  };

  const handleCloseImportDialog = () => {
    setShowImportDialog(false);
  };

  const handleConfirmImport = async () => {
    try {
      // TODO: Here you would typically call an API to save the imported students
      // Example: await addStudentsToCourse(courseId, importResult.importedStudents);

      console.log('Confirming import of students:', importResult.importedStudents);

      // Close dialog and show success message
      setShowImportDialog(false);

      // You might want to update local state to show the new students immediately
      // or refetch the students list from the server
    } catch (error) {
      console.error('Error saving imported students:', error);
      alert('Error saving imported students. Please try again.');
    }
  };

  return (
    <>
      {/* Verification Settings Card */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Join Verification Settings"
          subheader="Configure how students can join this course"
          action={
            !editingJoinMode ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Iconify icon="solar:pen-bold" />}
                onClick={handleStartEdit}
              >
                Edit
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  onClick={handleSaveJoinMode}
                  disabled={isSaving}
                  startIcon={isSaving ? <Iconify icon="solar:loading-bold" /> : <Iconify icon="solar:diskette-bold" />}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            )
          }
        />
        <Divider />
        <CardContent>
          {!editingJoinMode ? (
            // Read-only mode
            <Box>
              {savedCombinations.length === 0 ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  No verification requirements set. Students can join without verification.
                </Alert>
              ) : (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Students can join using ANY of the following combinations:
                  </Typography>
                  {getJoinModeDisplay(savedCombinations)}
                </Box>
              )}
            </Box>
          ) : (
            // Edit mode
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Create verification combinations. Students can join if they provide ANY of the saved combinations.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Student ID is always required and cannot be removed.
                </Typography>
              </Alert>

              {/* Current Combination Builder */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Build Combination:
                </Typography>
                <Grid container spacing={2}>
                  {joinCheckingModes.map((mode) => (
                    <Grid key={mode.value} size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box
                        onClick={() => toggleFlag(mode.value)}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: 2,
                          borderColor: hasFlag(currentCombination, mode.value) ? `${mode.color}.main` : 'divider',
                          bgcolor: hasFlag(currentCombination, mode.value) ? `${mode.color}.lighter` : 'background.paper',
                          cursor: mode.value === 1 ? 'not-allowed' : 'pointer',
                          opacity: mode.value === 1 ? 0.8 : 1,
                          transition: 'all 0.2s',
                          '&:hover': mode.value !== 1 && {
                            borderColor: `${mode.color}.main`,
                            bgcolor: `${mode.color}.lighter`,
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Iconify icon={mode.icon} width={24} color={`${mode.color}.main`} />
                          <Typography variant="subtitle2">{mode.label}</Typography>
                          {hasFlag(currentCombination, mode.value) && (
                            <Iconify icon="solar:check-circle-bold" width={20} color={`${mode.color}.main`} />
                          )}
                          {mode.value === 1 && (
                            <Label color="error" variant="soft" sx={{ ml: 'auto' }}>
                              Required
                            </Label>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Iconify icon="solar:add-circle-bold" />}
                    onClick={addCombination}
                    disabled={currentCombination === 1 || savedCombinations.includes(currentCombination)}
                  >
                    Add Combination
                  </Button>
                  {savedCombinations.length > 0 && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                      onClick={clearAll}
                    >
                      Clear All
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Saved Combinations */}
              {savedCombinations.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Saved Combinations ({savedCombinations.length}):
                  </Typography>
                  <Stack spacing={1.5}>
                    {savedCombinations.map((combination, index) => {
                      const modes = joinCheckingModes.filter((m) => hasFlag(combination, m.value));
                      return (
                        <Box
                          key={`saved-${combination}-${index}`}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            p: 1.5,
                            borderRadius: 2,
                            border: 1,
                            borderColor: 'divider',
                            bgcolor: 'background.neutral',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                            Option {index + 1}:
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
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeCombination(combination)}
                            sx={{ ml: 'auto' }}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Students Table Card */}
      <Card>
        <CourseDetailsStudentsTableToolbar
          filters={filters}
          onResetFilters={handleResetFilters}
          resultsCount={dataFiltered.length}
          totalCount={students.length}
          onImportCSV={handleImportCSV}
          onAddStudent={handleAddStudent}
          onRefresh={handleRefreshStudents}
        />

        <Box sx={{ position: 'relative' }}>
          <TableSelectedAction
            dense={table.dense}
            numSelected={table.selected.length}
            rowCount={dataFiltered.length}
            onSelectAllRows={(checked) =>
              table.onSelectAllRows(
                checked,
                dataFiltered.map((row, index) => row.id || row.studentId || `student-${index}`)
              )
            }
            action={
              <Tooltip title="Delete">
                <IconButton
                  color="primary"
                  onClick={() => {
                    handleDeleteRows(table.selected);
                  }}
                >
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Tooltip>
            }
          />
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={TABLE_HEAD}
                rowCount={dataFiltered.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(
                    checked,
                    dataFiltered.map((row, index) => row.id || row.studentId || `student-${index}`)
                  )
                }
              />

              <TableBody>
                {dataFiltered
                  .slice(
                    table.page * table.rowsPerPage,
                    table.page * table.rowsPerPage + table.rowsPerPage
                  )
                  .map((row, index) => {
                    const rowKey = row.id || row.studentId || `student-${index}`;
                    return (
                      <StudentTableRow
                        key={rowKey}
                        row={row}
                        selected={table.selected.includes(rowKey)}
                        onSelectRow={() => table.onSelectRow(rowKey)}
                        onDeleteRow={() => handleDeleteRow(rowKey)}
                        onEditRow={() => handleEditStudent(row)}
                      />
                    );
                  })}

                <TableEmptyRows
                  height={table.dense ? 56 : 56 + 20}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                />

                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>
        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={dataFiltered.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
        {/* Import Preview Dialog */}
        <CourseDetailsImportDialog
          courseId={selectedCourse?.id}
          open={showImportDialog}
          onClose={handleCloseImportDialog}
          onConfirm={handleConfirmImport}
          importResult={importResult}
        />

        {/* Delete Confirmation Dialog */}
        <CourseDetailsDeleteDialog
          open={showDeleteDialog}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleConfirmDelete}
          courseId={selectedCourse?.id}
          students={studentsToDelete}
          isMultiple={isMultipleDelete}
        />

        {/* Student Form Dialog */}
        <CourseDetailsStudentFormDialog
          open={showStudentFormDialog}
          onClose={handleCloseStudentFormDialog}
          onSubmit={handleSubmitStudent}
          student={editingStudent}
          isLoading={isSubmittingStudent}
        />
      </Card>
    </>
  );
}
