import { Card, IconButton, ListItemText, Stack, Tooltip, Typography } from "@mui/material";
import { usePopover } from "minimal-shared/hooks";
import Link from "next/link";
import { Iconify } from "src/components/iconify";
import { Label } from "src/components/label";
import { RouterLink } from "src/routes/components";
import { fDate } from "src/utils/format-time";



export default function CourseItem({ course }) {
    const menuActions = usePopover();

    const renderInfoBlock = () => (
        <>

        </>
    );


    return (
        <Card
            sx={{ p: 3, width: '320px' }}>
            <IconButton onClick={menuActions.onOpen} sx={{ position: 'absolute', top: 8, right: 8 }}>
                <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
            <Stack direction={'column'} spacing={2} mb={3}>


                <ListItemText
                    sx={{ mb: 1 }}
                    primary={
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Tooltip title={course.courseCode}>
                                <Typography
                                    component={RouterLink}
                                    href={`/courses/${course.id}`}
                                    sx={{
                                        textTransform: 'uppercase',
                                        fontWeight: 'bold',
                                        color: 'text.primary',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '120px'
                                    }}
                                    variant="h6">{course.courseCode}
                                </Typography>
                            </Tooltip>
                            <Label variant="soft" color={'info'} sx={{ textTransform: 'uppercase', mr: 2 }}>
                                {`${course.academicYear}/${course.academicYear + 1} ${course.semester > 0 ? 'Sem ' + course.semester : ''}`}
                            </Label>
                        </Stack>
                    }
                    secondary={
                        <Tooltip title={course.courseName}>
                            <Typography
                                sx={{
                                    typography: 'subtitle1',
                                    color: 'text.disabled'
                                }}
                            >
                                {`${course.courseName}`}
                            </Typography>
                        </Tooltip>
                    }
                    slotProps={{
                        primary: { sx: { typography: 'h6' } },
                        secondary: {
                            sx: {
                                mt: 1,
                                typography: 'subtitle1',
                                color: 'text.disabled',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                lineHeight: 1.4,
                                maxWidth: '300px',
                                maxHeight: '3.2em' // 約2行的高度
                            },
                        },
                    }}
                />
                {renderInfoBlock()}
            </Stack>
        </Card>
    );
}