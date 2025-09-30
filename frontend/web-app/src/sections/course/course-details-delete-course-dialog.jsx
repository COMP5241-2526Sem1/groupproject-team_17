import PropTypes from 'prop-types';

import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function CourseDetailsSettingsDeleteDialog({
  open,
  onClose,
  onConfirm,
  course = null,
}) {

  const formatSemester = (semester) => {
    const semesterMap = {
      0: 'None',
      1: 'Semester 1',
      2: 'Semester 2',
      3: 'Summer'
    };
    return semesterMap[semester] || 'Unknown';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderColor: 'error.main',
          borderWidth: 2,
          borderStyle: 'solid',
        }
      }}
    >
      <DialogTitle sx={{ color: 'error.main' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="eva:alert-triangle-fill" width={24} />
          <Typography variant="h6" color="error.main">
            Delete Course
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          <Typography variant="body1">
            Are you sure you want to delete this course? This action cannot be undone.
          </Typography>

          {course && (
            <List sx={{ bgcolor: 'background.neutral', borderRadius: 1 }}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <Iconify icon="eva:book-fill" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight={600}>
                      {course.courseCode} - {course.courseName}
                    </Typography>
                  }
                  secondary={
                    <Stack spacing={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        {course.academicYear} - {formatSemester(course.semester)}
                      </Typography>
                      {course.description && (
                        <Typography variant="body2" color="text.secondary">
                          {course.description}
                        </Typography>
                      )}
                    </Stack>
                  }
                />
              </ListItem>
            </List>
          )}

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="error.main">
              What will be deleted:
            </Typography>
            <List dense>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemAvatar sx={{ minWidth: 32 }}>
                  <Iconify icon="eva:people-fill" width={20} color="error.main" />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      All enrolled students ({course?.studentCount || 0} students)
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemAvatar sx={{ minWidth: 32 }}>
                  <Iconify icon="eva:monitor-fill" width={20} color="error.main" />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      All classes and activities ({course?.classCount || 0} classes)
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemAvatar sx={{ minWidth: 32 }}>
                  <Iconify icon="eva:hard-drive-fill" width={20} color="error.main" />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      All course data and history
                    </Typography>
                  }
                />
              </ListItem>
            </List>
          </Stack>

          <Typography variant="body2" color="error.main" fontWeight={500}>
            ⚠️ This action is permanent and cannot be undone!
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          startIcon={<Iconify icon="eva:trash-2-fill" />}
        >
          Delete Course
        </Button>
      </DialogActions>
    </Dialog>
  );
}

CourseDetailsSettingsDeleteDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onConfirm: PropTypes.func,
  course: PropTypes.object,
};
