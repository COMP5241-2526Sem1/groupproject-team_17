'use client';

import { useEffect, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function EditPollDialog({ open, onClose, onSubmit, activity }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState([
    { text: '', imageUrl: '' },
    { text: '', imageUrl: '' },
  ]);
  const [allowMultipleSelections, setAllowMultipleSelections] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load activity data when dialog opens
  useEffect(() => {
    setIsInitialized(false); // Mark as not initialized when dialog state changes

    if (open && activity) {
      console.log('[EditPollDialog] Loading activity:', activity, 'isActive:', activity.isActive);
      setTitle(activity.title || '');
      setDescription(activity.description || '');
      setOptions(
        activity.options && activity.options.length > 0
          ? activity.options
          : [
            { text: '', imageUrl: '' },
            { text: '', imageUrl: '' },
          ]
      );
      setAllowMultipleSelections(activity.allowMultipleSelections || false);
      setIsAnonymous(activity.isAnonymous !== undefined ? activity.isAnonymous : true);
      setError('');
      setIsInitialized(true); // Mark as initialized
    } else if (!open) {
      // Reset form when dialog closes
      setTitle('');
      setDescription('');
      setOptions([
        { text: '', imageUrl: '' },
        { text: '', imageUrl: '' },
      ]);
      setAllowMultipleSelections(false);
      setIsAnonymous(true);
      setError('');
      setIsInitialized(false);
    }
  }, [open, activity]);

  // Add a new option
  const handleAddOption = () => {
    setOptions([...options, { text: '', imageUrl: '' }]);
  };

  // Remove an option
  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  // Update option text
  const handleOptionTextChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index].text = value;
    setOptions(newOptions);
  };

  // Update option image URL (optional)
  const handleOptionImageChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index].imageUrl = value;
    setOptions(newOptions);
  };

  // Validate form
  const validateForm = () => {
    if (!title.trim()) {
      setError('Poll title is required');
      return false;
    }

    const validOptions = options.filter((opt) => opt.text.trim());
    if (validOptions.length < 2) {
      setError('At least 2 options with text are required');
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
      // Filter out empty options
      const validOptions = options
        .filter((opt) => opt.text.trim())
        .map((opt) => ({
          text: opt.text.trim(),
          imageUrl: opt.imageUrl?.trim() || null,
        }));

      const pollData = {
        title: title.trim(),
        description: description.trim(),
        options: validOptions,
        allowMultipleSelections,
        isAnonymous,
      };

      await onSubmit(pollData);
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to update poll');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset and close dialog
  const handleClose = () => {
    setError('');
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:chart-2-bold" width={24} />
          <Typography variant="h6">Edit Poll</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Poll Title */}
          <TextField
            label="Poll Title"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Which topic should we cover next?"
          />

          {/* Poll Description */}
          <TextField
            label="Description (Optional)"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any additional context or instructions..."
          />

          {/* Poll Options */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Options (minimum 2 required)
            </Typography>
            <Stack spacing={2}>
              {options.map((option, index) => (
                <Box key={index}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <TextField
                      label={`Option ${index + 1}`}
                      fullWidth
                      required
                      value={option.text}
                      onChange={(e) => handleOptionTextChange(index, e.target.value)}
                      placeholder={`Enter option ${index + 1}`}
                    />
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveOption(index)}
                      disabled={options.length <= 2}
                    >
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>
            <Button
              size="small"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              onClick={handleAddOption}
              sx={{ mt: 2 }}
            >
              Add Option
            </Button>
          </Box>

          {/* Poll Settings */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Poll Settings
            </Typography>
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={allowMultipleSelections}
                    onChange={(e) => setAllowMultipleSelections(e.target.checked)}
                  />
                }
                label="Allow Multiple Selections"
              />
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={
            submitting ? (
              <Iconify icon="svg-spinners:8-dots-rotate" />
            ) : (
              <Iconify icon="solar:check-circle-bold" />
            )
          }
        >
          {submitting ? 'Updating...' : 'Update Poll'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
