import { Tooltip, Checkbox, TableRow, TableCell, IconButton, Typography } from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function StudentTableRow({ row, selected, onSelectRow, onDeleteRow, onEditRow }) {
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
          width: '100px',
        }}
      >
        ****
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
