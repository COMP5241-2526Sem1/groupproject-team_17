'use client';

import { Alert, Box, Button, Container, Paper, Typography } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Suspense, useEffect, useState } from 'react';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

function QRCodeContent() {
  const searchParams = useSearchParams();
  const classCode = searchParams.get('class');
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && classCode) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/classroom/?class=${classCode}`;
      setJoinUrl(url);
    }
  }, [classCode]);

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

  const handlePrint = () => {
    window.print();
  };

  if (!classCode) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
        }}
      >
        <Alert severity="error">No class code provided</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            '@media print': {
              boxShadow: 'none',
              border: 'none',
            },
          }}
        >
          {/* Title */}
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
            Join Classroom
          </Typography>

          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
            Scan QR Code to Join
          </Typography>

          {/* QR Code - No Logo */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 4,
              p: 3,
              bgcolor: 'white',
              borderRadius: 2,
              boxShadow: (theme) => theme.shadows[2],
            }}
          >
            {joinUrl ? (
              <QRCodeSVG
                value={joinUrl}
                size={300}
                level="H"
                includeMargin
              />
            ) : (
              <Box
                sx={{
                  width: 300,
                  height: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography color="text.secondary">Loading...</Typography>
              </Box>
            )}
          </Box>

          {/* Join Code Display */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Class Code: {classCode}
            </Typography>
          </Alert>

          {/* URL Display */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 1,
              mb: 3,
              wordBreak: 'break-all',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }}
            >
              {joinUrl}
            </Typography>
          </Box>

          {/* Action Buttons - Hidden on Print */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              '@media print': {
                display: 'none',
              },
            }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<Iconify icon={copied ? 'solar:check-circle-bold' : 'solar:copy-bold'} />}
              onClick={handleCopyUrl}
              sx={{ minWidth: 140 }}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<Iconify icon="solar:printer-bold" />}
              onClick={handlePrint}
              sx={{ minWidth: 140 }}
            >
              Print
            </Button>
          </Box>

          {/* Instructions - Hidden on Print */}
          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
              '@media print': {
                display: 'none',
              },
            }}
          >
            <Typography variant="caption" color="text.secondary">
              💡 Students can scan this QR code with their phone camera or enter the class code manually
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

// ----------------------------------------------------------------------

export default function JoinClassroomQRPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography>Loading...</Typography>
        </Box>
      }
    >
      <QRCodeContent />
    </Suspense>
  );
}
