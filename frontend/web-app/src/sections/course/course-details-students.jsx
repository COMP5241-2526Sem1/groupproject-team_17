import { useSetState } from 'minimal-shared/hooks';
import { useRef, useMemo, useState, useEffect } from 'react';

import { Box, Card, Table, Tooltip, TableBody, IconButton } from '@mui/material';

import { useSelector } from 'src/redux/hooks';
import { ClassManagementActions } from 'src/redux/actions/reducerActions';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';

import StudentTableRow from './course-details-students-table-row';
import CourseDetailsImportDialog from './course-details-import-dialog';
import CourseDetailsDeleteDialog from './course-details-delete-student-dialog';
import CourseDetailsStudentFormDialog from './course-details-students-form-dialog';
import CourseDetailsStudentsTableToolbar from './course-details-students-table-toolbar';

// ----------------------------------------------------------------------

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
    <Card>
      <CourseDetailsStudentsTableToolbar
        filters={filters}
        onResetFilters={handleResetFilters}
        resultsCount={dataFiltered.length}
        totalCount={students.length}
        onImportCSV={handleImportCSV}
        onAddStudent={handleAddStudent}
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
  );
}
