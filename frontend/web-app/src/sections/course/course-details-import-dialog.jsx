import { useState } from 'react';

import {
  Box,
  Table,
  Button,
  Dialog,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  DialogTitle,
  DialogActions,
  DialogContent,
} from '@mui/material';

import { ClassManagementActions } from 'src/redux/actions/reducerActions';

import { useErrorDialog } from 'src/components/error-dialog';

export default function CourseDetailsImportDialog({
  open,
  onClose,
  courseId,
  onConfirm,
  importResult,
}) {
  const errorDialog = useErrorDialog();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    //console.log('Import confirmed:', importResult);
    const studentsToImport = importResult?.importedStudents || [];
    if (studentsToImport.length > 0) {
      // Dispatch action to upload students
      var res = await ClassManagementActions.uploadStudents(courseId, studentsToImport);
      if (res?.code == 0) {
        ClassManagementActions.getCourseDetails(courseId);
      }
      else {
        errorDialog.showResError(res, 'Failed to import students');
      }
    }

    setIsSubmitting(false);
    onConfirm();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="import-dialog-title"
      aria-describedby="import-dialog-description"
      keepMounted={false}
      disableEnforceFocus={false}
      disableAutoFocus={false}
      disableRestoreFocus={false}
    >
      <DialogTitle id="import-dialog-title">
        {importResult?.success ? 'Import Preview' : 'Import Failed'}
      </DialogTitle>

      <DialogContent id="import-dialog-description">
        {importResult?.success ? (
          <>
            {/* Success Summary */}
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Import Summary:</strong>
            </Typography>
            <Box sx={{ mb: 3, p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
              <Typography variant="body2" color="success.dark">
                ✅ Successfully imported <strong>{importResult.importedCount}</strong> student(s)
                {importResult.ignoredCount > 0 && (
                  <>
                    <br />
                    ⚠️ Ignored <strong>{importResult.ignoredCount}</strong> row(s) with errors
                  </>
                )}
              </Typography>
            </Box>

            {/* Error Summary if any */}
            {importResult.errors?.length > 0 && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="warning.dark" sx={{ mb: 1 }}>
                  Ignored Rows:
                </Typography>
                {importResult.errors.slice(0, 5).map((error, index) => (
                  <Typography key={index} variant="caption" color="warning.dark" display="block">
                    • {error}
                  </Typography>
                ))}
                {importResult.errors.length > 5 && (
                  <Typography variant="caption" color="warning.dark">
                    ... and {importResult.errors.length - 5} more
                  </Typography>
                )}
              </Box>
            )}

            {/* Preview Table */}
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Preview of Imported Students:</strong>
            </Typography>
            <Box
              sx={{
                maxHeight: 300,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Full Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>PIN</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importResult.importedStudents?.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.studentId}</TableCell>
                      <TableCell>{student.fullName}</TableCell>
                      <TableCell>{student.email || '-'}</TableCell>
                      <TableCell>{student.PIN ? '****' : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </>
        ) : (
          /* Error Message */
          <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 1 }}>
            <Typography variant="body2" color="error.dark">
              ❌ <strong>Import Failed:</strong>
              <br />
              {importResult?.errorMessage}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        {importResult?.success && (
          <Button
            loading={isSubmitting}
            onClick={handleConfirm}
            variant="contained"
            color="primary"
          >
            Confirm Import ({importResult.importedCount} students)
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
