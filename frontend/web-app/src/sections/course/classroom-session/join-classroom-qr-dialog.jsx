'use client';

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function JoinClassroomQRDialog({ open, onClose, courseId, joinCode, courseData }) {
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (courseId || joinCode)) {
      const baseUrl = window.location.origin;
      // Use joinCode if provided, otherwise use courseId
      const code = joinCode || courseId;
      const url = `${baseUrl}/classroom/?class=${code}`;
      setJoinUrl(url);
    }
  }, [courseId, joinCode]);

  const handleCopyUrl = async () => {
    if (!joinUrl) return;

    try {
      // Try modern Clipboard API first (works on HTTPS and localhost)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(joinUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for HTTP or older browsers
        const textArea = document.createElement('textarea');
        textArea.value = joinUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      // Still show visual feedback even if copy failed
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
        }}
      >
        <Box>
          <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
            Join Classroom
          </Typography>
          {courseData && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {courseData.courseCode} - {courseData.courseName}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <Iconify icon="solar:close-circle-bold" width={24} />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            py: 2,
          }}
        >
          {/* QR Code */}
          <Box
            sx={{
              p: 3,
              bgcolor: 'white',
              borderRadius: 2,
              boxShadow: (theme) => theme.shadows[4],
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {joinUrl ? (
              <QRCodeSVG
                value={joinUrl}
                size={256}
                level="H"

              />
            ) : (

              <Box sx={{ width: 256, height: 256, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">Loading QR Code...</Typography>
              </Box>
            )}
          </Box>

          {/* Instructions */}
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Students can scan this QR code to join
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Or share the link below
            </Typography>

            {/* Join Code Display */}
            {(joinCode || courseId) && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Join Code: <strong>{joinCode || courseId}</strong>
                </Typography>
              </Alert>
            )}

            {/* URL Display and Copy Button */}
            <Box
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                }}
              >
                {joinUrl}
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<Iconify icon={copied ? 'solar:check-circle-bold' : 'solar:copy-bold'} />}
                onClick={handleCopyUrl}
                sx={{ minWidth: 100 }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary">
              💡 Tip: You can also display this QR code on a projector for easy access
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
