'use client';

import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import {
  Alert,
  Stack,
  Button,
  Dialog,
  Collapse,
  Typography,
  DialogTitle,
  DialogActions,
  DialogContent,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function ErrorDialog({
  open = false,
  type = 'error',
  title = '',
  message = '',
  detailsTitle = 'Details',
  subDetails = '',
  details = '',
  severity = 'error',
  code = null,
  traceId = null,
  autoHideDuration = null,
  actions = null,
  onClose,
  onConfirm,
  onCancel,
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Copy details to clipboard
  const handleCopyDetails = async () => {
    try {
      await navigator.clipboard.writeText(details);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy details:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = details;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Clear dialog state when closed
  useEffect(() => {
    if (!open) {
      // Reset all dialog states when dialog closes
      setShowDetails(false);
      setCopySuccess(false);
    }
  }, [open]);

  // Auto-hide functionality
  useEffect(() => {
    if (open && autoHideDuration) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, autoHideDuration, onClose]);

  // Get icon based on severity
  const getIcon = () => {
    switch (severity) {
      case 'res':
        return 'eva:alert-circle-fill';
      case 'error':
        return 'eva:alert-circle-fill';
      case 'warning':
        return 'eva:alert-triangle-fill';
      case 'info':
        return 'eva:info-fill';
      case 'success':
        return 'eva:checkmark-circle-fill';
      default:
        return 'eva:alert-circle-fill';
    }
  };

  // Get color based on severity
  const getColor = () => {
    switch (severity) {
      case 'res':
        return 'error';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      default:
        return 'error';
    }
  };

  // Handle action buttons
  const renderActions = () => {
    if (type === 'confirm' && actions?.includes('cancel') && actions?.includes('confirm')) {
      return (
        <>
          <Button onClick={onCancel} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="contained"
            color="error"
            startIcon={<Iconify icon="eva:checkmark-fill" />}
          >
            Confirm
          </Button>
        </>
      );
    }

    if (type === 'confirm' && actions?.includes('cancel') && actions?.includes('retry')) {
      return (
        <>
          <Button onClick={onCancel} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="eva:refresh-fill" />}
          >
            Retry
          </Button>
        </>
      );
    }

    // Default single action
    return (
      <Button onClick={onClose} variant="contained" color={getColor()}>
        OK
      </Button>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h6" color={`${getColor()}`}>
            <Iconify icon={getIcon()} width={28} color={`${getColor()}.main`} />
          </Typography>
          <Typography variant="h6" color={`${getColor()}`}>
            {title}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          <Alert severity={getColor()} variant="outlined" sx={{ mb: 1 }}>
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {message}
            </Typography>
          </Alert>

          {details && (
            <Stack spacing={1}>
              <Button
                variant="text"
                size="small"
                onClick={() => setShowDetails(!showDetails)}
                startIcon={
                  <Iconify
                    icon={showDetails ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'}
                    width={16}
                  />
                }
                sx={{
                  justifyContent: 'flex-start',
                  color: 'text.secondary',
                  textTransform: 'none',
                }}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>

              <Collapse in={showDetails}>
                <Alert
                  severity="info"
                  variant="outlined"
                  sx={{
                    bgcolor: 'grey.50',
                    '& .MuiAlert-message': {
                      width: '100%',
                    },
                  }}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Typography variant="subtitle2" color="text.secondary">
                        {detailsTitle}
                      </Typography>
                      <Button
                        size="small"
                        variant="text"
                        onClick={handleCopyDetails}
                        startIcon={
                          <Iconify
                            icon={copySuccess ? 'eva:checkmark-fill' : 'eva:copy-fill'}
                            width={16}
                          />
                        }
                        sx={{
                          minWidth: 'auto',
                          px: 1,
                          color: copySuccess ? 'success.main' : 'text.secondary',
                          textTransform: 'none',
                          fontSize: '0.75rem',
                        }}
                      >
                        {copySuccess ? 'Copied!' : 'Copy'}
                      </Button>
                    </Stack>

                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        maxHeight: 200,
                        overflow: 'auto',
                        bgcolor: 'background.paper',
                        p: 1,
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                      }}
                    >
                      {details}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {subDetails}
                    </Typography>
                  </Stack>
                </Alert>
              </Collapse>
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>{renderActions()}</DialogActions>
    </Dialog>
  );
}

ErrorDialog.propTypes = {
  open: PropTypes.bool,
  type: PropTypes.oneOf(['error', 'warning', 'info', 'confirm']),
  title: PropTypes.string,
  message: PropTypes.string,
  details: PropTypes.string,
  severity: PropTypes.oneOf(['error', 'warning', 'info', 'success']),
  autoHideDuration: PropTypes.number,
  actions: PropTypes.arrayOf(PropTypes.string),
  onClose: PropTypes.func,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
};
