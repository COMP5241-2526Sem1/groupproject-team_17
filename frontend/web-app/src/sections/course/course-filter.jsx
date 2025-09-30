import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

export default function CourseFilter({
  open,
  onOpen,
  onClose,
  onSearch,
  searchKeyword = '',
  canReset = false,
  onReset
}) {
  const mdUp = useMediaQuery((theme) => theme.breakpoints.up('md'));

  const resetFilters = () => {
    if (onReset) {
      onReset();
    }
  };

  const handleSearchChange = (event) => {
    if (onSearch) {
      onSearch(event.target.value);
    }
  };

  const clearSearch = () => {
    if (onSearch) {
      onSearch('');
    }
  };

  const renderContent = () => (
    <Box sx={{ p: 2.5 }}>
      <Stack spacing={3}>
        {/* Search Section */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Search
          </Typography>
          <TextField
            fullWidth
            placeholder="Search by course code, name, or description..."
            value={searchKeyword}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: searchKeyword && (
                <InputAdornment position="end">
                  <IconButton onClick={clearSearch} edge="end" size="small">
                    <Iconify icon="eva:close-fill" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Quick Actions */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Quick Actions
          </Typography>
          <Stack spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="eva:refresh-fill" />}
              onClick={resetFilters}
              disabled={!canReset}
            >
              Reset All Filters
            </Button>
          </Stack>
        </Box>

        {/* Active Filters */}
        {(searchKeyword) && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Active Filters
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {searchKeyword && (
                <Chip
                  label={`Search: "${searchKeyword}"`}
                  size="small"
                  onDelete={clearSearch}
                  deleteIcon={<Iconify icon="eva:close-fill" />}
                />
              )}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );

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
        {renderContent()}
      </Drawer>
    </>
  );
}
