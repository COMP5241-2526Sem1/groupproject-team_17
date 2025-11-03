import {
  Box,
  List,
  Alert,
  Button,
  Dialog,
  ListItem,
  Typography,
  DialogTitle,
  ListItemText,
  DialogActions,
  DialogContent,
} from '@mui/material';

import { ClassManagementActions } from 'src/redux/actions/reducerActions';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function CourseDetailsDeleteDialog({
  open,
  onClose,
  onConfirm,
  courseId,
  students = [],
  isMultiple = false,
}) {
  const studentCount = students.length;
  const isLoading = false; // You can add loading state here if needed

  const handleConfirm = async () => {
    var res = await ClassManagementActions.removeStudentsFromCourse(
      courseId,
      students.map((student) => student.id)
    );

    if (res?.code == 0) {
      ClassManagementActions.getCourseDetails(courseId);
    }

    onConfirm();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Iconify
            icon="solar:trash-bin-trash-bold"
            sx={{ color: 'error.main', width: 24, height: 24 }}
          />
          <Typography variant="h6">
            {isMultiple ? `Delete ${studentCount} Students` : 'Delete Student'}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This action cannot be undone. The selected student{isMultiple ? 's' : ''} will be removed
          from this course.
        </Alert>
        <Typography sx={{ mb: 2 }}>
          Are you sure you want to delete the following student{isMultiple ? 's' : ''}?
        </Typography>
        <List
          dense
          sx={{
            maxHeight: 200,
            overflow: 'auto',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          {students.map((student, idx) => (
            <ListItem
              key={student.id || student.studentId || idx}
              divider={idx < students.length - 1}
            >
              <ListItemText
                primary={student.fullName || student.name || 'Unknown Name'}
                secondary={`ID: ${student.studentId} • ${student.email}`}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="error">
          {isMultiple ? `Delete ${studentCount} Students` : 'Delete Student'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
