'use client';

import { useEffect, useState } from 'react';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField
} from '@mui/material';

// ----------------------------------------------------------------------

export default function EditDiscussionDialog({ open, onClose, onSubmit, activity }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxLength, setMaxLength] = useState(500);
  const [allowAnonymous, setAllowAnonymous] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load activity data when dialog opens
  useEffect(() => {
    setIsInitialized(false); // Mark as not initialized when dialog state changes

    if (open && activity) {
      console.log('[EditDiscussionDialog] Loading activity:', activity, 'isActive:', activity.isActive);
      setTitle(activity.title || '');
      setDescription(activity.description || '');
      setMaxLength(activity.maxLength || 500);
      setAllowAnonymous(activity.allowAnonymous || false);
      setRequireApproval(activity.requireApproval || false);
      setError('');
      setIsInitialized(true); // Mark as initialized
    } else if (!open) {
      // Reset form when dialog closes
      setTitle('');
      setDescription('');
      setMaxLength(500);
      setAllowAnonymous(false);
      setRequireApproval(false);
      setError('');
      setIsInitialized(false);
    }
  }, [open, activity]);

  // Validate form
  const validateForm = () => {
    if (!title.trim()) {
      setError('Discussion title is required');
      return false;
    }

    if (maxLength < 1 || maxLength > 5000) {
      setError('Max length must be between 1 and 5000 characters');
      return false;
    }

    setError('');
    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const discussionData = {
        title: title.trim(),
        description: description.trim(),
        maxLength,
        allowAnonymous,
        requireApproval,
      };

      await onSubmit(activity.id, discussionData);
      handleClose();
    } catch (err) {
      console.error('Error updating discussion:', err);
      setError(err.message || 'Failed to update discussion');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form and close dialog
  const handleClose = () => {
    setError('');
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Discussion</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Title */}
          <TextField
            label="Discussion Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What topic do you want to discuss?"
            fullWidth
            required
            disabled={submitting}
          />

          {/* Description */}
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide context or instructions for the discussion"
            multiline
            rows={3}
            fullWidth
            disabled={submitting}
          />

          {/* Max Length */}
          <TextField
            label="Maximum Text Length"
            type="number"
            value={maxLength}
            onChange={(e) => setMaxLength(parseInt(e.target.value, 10) || 500)}
            helperText="Maximum characters allowed per response (1-5000)"
            fullWidth
            required
            disabled={submitting}
            inputProps={{ min: 1, max: 5000 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Updating...' : 'Update Discussion'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
