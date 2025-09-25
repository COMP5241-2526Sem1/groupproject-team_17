'use client';

import { useState, useCallback } from 'react';
import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import Button, { buttonClasses } from '@mui/material/Button';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';
import { COURSE_CREATED } from 'src/_mock';
import { Searchbar } from './searchbar';
import { TextField } from '@mui/material';

// ----------------------------------------------------------------------

export function CoursePopover({ data = [], sx, ...other }) {
    data = COURSE_CREATED;
    const mediaQuery = 'sm';

    const { open, anchorEl, onClose, onOpen } = usePopover();

    const [course, setCourse] = useState(data[0]);

    const [filter, setFilter] = useState('');

    const [filteredCourses, setFilteredCourses] = useState(data);

    const handleChangeCourse = useCallback(
        (newValue) => {
            setCourse(newValue);
            onClose();
        },
        [onClose]
    );

    const handleFilter = useCallback(
        (input) => {
            setFilter(input);

            const filtered = data.filter((course) =>
                course.title.toLowerCase().includes(input.toLowerCase())
            );
            setFilteredCourses(filtered);
        },
        []
    );
    const buttonBg = {
        height: 1,
        zIndex: -1,
        opacity: 0,
        content: "''",
        borderRadius: 1,
        position: 'absolute',
        visibility: 'hidden',
        bgcolor: 'action.hover',
        width: 'calc(100% + 8px)',
        transition: (theme) =>
            theme.transitions.create(['opacity', 'visibility'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.shorter,
            }),
        ...(open && {
            opacity: 1,
            visibility: 'visible',
        }),
    };

    const renderButton = () => (
        <ButtonBase
            disableRipple
            onClick={onOpen}
            sx={[
                {
                    py: 0.5,
                    gap: { xs: 0.5, [mediaQuery]: 1 },
                    '&::before': buttonBg,
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            {...other}
        >
            {course?.logo && <Box
                component="img"
                alt={course?.title}
                src={course?.logo}
                sx={{ width: 24, height: 24, borderRadius: '50%' }}
            />}

            <Box
                component="span"
                sx={{ typography: 'subtitle2', display: { xs: 'none', [mediaQuery]: 'inline-flex' } }}
            >
                {course?.title}
            </Box>

            <Label
                color={course?.plan === 'Free' ? 'default' : 'info'}
                sx={{
                    height: 22,
                    cursor: 'inherit',
                    display: { xs: 'none', [mediaQuery]: 'inline-flex' },
                }}
            >
                {course?.plan}
            </Label>

            <Iconify width={16} icon="carbon:chevron-sort" sx={{ color: 'text.disabled' }} />
        </ButtonBase>
    );

    const renderMenuList = () => (
        <CustomPopover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            slotProps={{
                arrow: { placement: 'top-left' },
                paper: { sx: { mt: 0.5, ml: -1.55, width: 280 } },
            }}
        >
            {/* Search field with reset button */}
            <TextField
                fullWidth
                size="small"
                placeholder="Search course..."
                sx={{ p: 1.5 }}
                value={filter}
                onChange={(e) => handleFilter(e.target.value)}
                InputProps={{
                    endAdornment: filter && (
                        <Iconify
                            icon="eva:close-fill"
                            sx={{ cursor: 'pointer', color: 'text.disabled' }}
                            onClick={() => handleFilter('')}
                        />
                    ),
                }}
            />

            <Scrollbar sx={{ maxHeight: 240 }}>
                <MenuList>
                    {filteredCourses.map((option) => (
                        <MenuItem
                            key={option.id}
                            selected={option.id === course?.id}
                            onClick={() => handleChangeCourse(option)}
                            sx={{ height: 48 }}
                        >
                            {option.logo && (
                                <Avatar alt={option.title} src={option.logo} sx={{ width: 24, height: 24 }} />
                            )}

                            <Typography
                                noWrap
                                component="span"
                                variant="body2"
                                sx={{ flexGrow: 1, fontWeight: 'fontWeightMedium' }}
                            >
                                {option.title}
                            </Typography>

                            <Label color={option.plan === 'Free' ? 'default' : 'info'}>
                                {option.plan}
                            </Label>
                        </MenuItem>
                    ))}
                </MenuList>
            </Scrollbar>

            <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />

            <Button
                fullWidth
                startIcon={<Iconify width={18} icon="mingcute:add-line" />}
                onClick={() => {
                    onClose();
                }}
                sx={{
                    gap: 2,
                    justifyContent: 'flex-start',
                    fontWeight: 'fontWeightMedium',
                    [`& .${buttonClasses.startIcon}`]: {
                        m: 0,
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    },
                }}
            >
                Create workspace
            </Button>
        </CustomPopover>
    );

    return (
        <>
            {renderButton()}
            {renderMenuList()}
        </>
    );
}
