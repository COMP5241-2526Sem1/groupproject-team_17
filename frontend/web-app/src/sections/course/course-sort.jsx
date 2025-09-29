import { usePopover } from 'minimal-shared/hooks';

import { Box, Button, MenuItem, MenuList } from '@mui/material';

import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

export default function CourseSort({ sort, onSort, sortOptions }) {
  const menuActions = usePopover();
  const renderPopover = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
    >
      <MenuList>
        {sortOptions?.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === sort}
            onClick={() => {
              menuActions.onClose();
              onSort?.(option.value);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuList>
    </CustomPopover>
  );
  return (
    <>
      <Button
        disableRipple
        color="inherit"
        onClick={menuActions.onOpen}
        endIcon={
          <Iconify
            icon={menuActions.open ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
          />
        }
        sx={{ fontWeight: 'fontWeightSemiBold' }}
      >
        Sort by:
        <Box
          component="span"
          sx={{ ml: 0.5, fontWeight: 'fontWeightBold', textTransform: 'capitalize' }}
        >
          {sortOptions?.find((option) => option.value === sort)?.label || 'Latest'}
        </Box>
      </Button>
      {renderPopover()}
    </>
  );
}
