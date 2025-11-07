'use client';

import {
  Alert,
  Box,
  Button,
  Popover,
  Typography,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function JoinClassroomQRPopover({ open, anchorEl, onClose, courseId, joinCode, courseData }) {
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
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      slotProps={{
        paper: {
          sx: {
            width: 380,
            p: 3,
            borderRadius: 2,
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Header */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            Join Classroom
          </Typography>
          {courseData && (
            <Typography variant="body2" color="text.secondary">
              {courseData.courseCode} - {courseData.courseName}
            </Typography>
          )}
        </Box>

        {/* QR Code */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 2,
            bgcolor: 'white',
            borderRadius: 1,
            boxShadow: (theme) => theme.shadows[2],
          }}
        >
          {joinUrl ? (
            <QRCodeSVG
              value={joinUrl}
              size={200}
              level="H"
            />
          ) : (
            <Box sx={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary" variant="body2">Loading...</Typography>
            </Box>
          )}
        </Box>

        {/* Join Code */}
        {(joinCode || courseId) && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            <Typography variant="body2">
              Join Code: <strong>{joinCode || courseId}</strong>
            </Typography>
          </Alert>
        )}

        {/* URL and Copy Button */}
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'grey.100',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography
            variant="caption"
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
            sx={{ minWidth: 90 }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </Box>
      </Box>
    </Popover>
  );
}
