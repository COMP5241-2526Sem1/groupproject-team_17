import {
  Box,
  Badge,
  Button,
  Drawer,
  Divider,
  Tooltip,
  IconButton,
  Typography,
  useMediaQuery,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

export default function CourseFilter({ open, onOpen, onClose, filters, canReset = false }) {
  const mdUp = useMediaQuery((theme) => theme.breakpoints.up('md'));

  const resetFilters = () => {};

  const renderHeader = () => (
    <>
      <Box
        sx={{
          py: 2,
          pr: 1,
          pl: 2.5,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Filters
        </Typography>

        <Tooltip title="Reset">
          <IconButton onClick={() => resetFilters()}>
            <Badge color="error" variant="dot" invisible={!canReset}>
              <Iconify icon="solar:restart-bold" />
            </Badge>
          </IconButton>
        </Tooltip>

        <IconButton onClick={onClose}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />
    </>
  );

  return (
    <>
      <Button
        disableRipple
        color="inherit"
        endIcon={
          <Badge color="error" variant="dot" invisible={!canReset}>
            <Iconify icon="ic:round-filter-list" />
          </Badge>
        }
        onClick={onOpen}
      >
        Filters
      </Button>
      <Drawer
        open={open}
        anchor={mdUp ? 'right' : 'bottom'}
        onClose={onClose}
        slotProps={{
          backdrop: { invisible: mdUp ? true : false },
          paper: {
            sx: mdUp
              ? {
                  width: 320,
                }
              : {
                  height: '65%',
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                },
          },
        }}
      >
        {renderHeader()}
      </Drawer>
    </>
  );
}
