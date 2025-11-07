import { Checkbox, IconButton, Stack, TableCell, TableRow, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function StudentTableRow({ row, selected, onSelectRow, onDeleteRow, onEditRow }) {
  const [showPin, setShowPin] = useState(false);

  const togglePinVisibility = () => {
    setShowPin(!showPin);
  };

  return (
    <TableRow hover selected={selected}>
      <TableCell padding="checkbox">
        <Checkbox checked={selected} onClick={onSelectRow} />
      </TableCell>

      <TableCell
        sx={{
          width: '120px',
        }}
      >
        {/*the student ID should be showing the under line only when mouse is hover*/}
        <Typography
          variant="body2"
          noWrap
          onClick={onEditRow}
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
        >
          {row.studentId}
        </Typography>
      </TableCell>

      <TableCell
        sx={{
          whiteSpace: 'nowrap',
          width: '150px',
        }}
      >
        <Typography
          sx={{
            maxWidth: 150,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          variant="subtitle2"
          noWrap
        >
          {row.fullName || row.name}
        </Typography>
      </TableCell>

      <TableCell
        sx={{
          width: '220px',
        }}
      >
        <Typography
          sx={{
            maxWidth: 220,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          variant="body2"
          noWrap
        >
          {row.email}
        </Typography>
      </TableCell>

      <TableCell
        sx={{
          whiteSpace: 'nowrap',
          width: '120px',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" sx={{ minWidth: 60 }}>
            {row.pin ? (showPin ? row.pin : '****') : ''}
          </Typography>
          {row.pin && (
            <Tooltip title={showPin ? 'Hide PIN' : 'Show PIN'}>
              <IconButton
                size="small"
                onClick={togglePinVisibility}
                sx={{
                  width: 28,
                  height: 28,
                  '&:hover': {
                    color: 'primary.main',
                  }
                }}
              >
                <Iconify
                  icon={showPin ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                  width={18}
                />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </TableCell>

      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Tooltip title="Edit Student">
          <IconButton onClick={onEditRow} sx={{ mr: 1 }}>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete Student">
          <IconButton onClick={onDeleteRow}>
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
