'use client'

import { Button, Card, Stack, Tab, Tabs, TextField, Typography } from "@mui/material"
import { color } from "framer-motion"
import { useBoolean, useSetState } from "minimal-shared/hooks"
import { CustomBreadcrumbs } from "src/components/custom-breadcrumbs"
import { Iconify } from "src/components/iconify"
import { Label } from "src/components/label"
import { RouterLink } from "src/routes/components"
import { CourseSearch } from "../course-search"
import CourseSort from "../course-sort"
import { EmptyContent } from "src/components/empty-content"
import CourseFilter from "../course-filter"
import CourseCreateDialog from "../course-create"
import { useSelector } from "src/redux/hooks"
import { useEffect } from "react"
import { ClassManagementActions } from "src/redux/actions/reducerActions"
import { CourseList } from "../course-list"

const { DashboardContent } = require("src/layouts/dashboard")



const TABS_OPTIONS = [
    { value: 'all', label: 'All', color: 'default' },
    { value: 'published', label: 'Published', color: 'info' },
    { value: 'disabled', label: 'Disabled', color: 'error' },
    { value: 'archived', label: 'Archived', color: 'warning' },
]

const SORT_OPTIONS = [
    { value: 'latest', label: 'Latest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'az', label: 'A-Z' },
    { value: 'za', label: 'Z-A' },
]


const MOCK_COURSE = [{
    "id": "string",
    "createdAt": "2025-09-28T08:10:36.966Z",
    "updatedAt": "2025-09-28T08:10:36.966Z",
    "ownerId": "string",
    "academicYear": 0,
    "semester": 1,
    "courseCode": "COMP5241",
    "courseName": "Software Engineering and Development",
    "description": "Software engineering is the application of engineering to the development of software in a systematic method. This course introduces the principles and techniques of software engineering, including requirements analysis, system design, implementation, testing, and maintenance. Students will learn how to apply these principles to develop high-quality software systems.",
    "classes": [
        {
            "id": "string",
            "createdAt": "2025-09-28T08:10:36.966Z",
            "updatedAt": "2025-09-28T08:10:36.966Z",
            "ownerId": "string",
            "courseId": "string",
            "identifier": "string",
            "description": "string",
            "date": "2025-09-28",
            "from": "08:10:36.966Z",
            "to": "08:10:36.966Z"
        }
    ],
    "students": [
        {
            "id": "string",
            "createdAt": "2025-09-28T08:10:36.966Z",
            "updatedAt": "2025-09-28T08:10:36.966Z",
            "ownerId": "string",
            "studentId": "string",
            "firstName": "string",
            "lastName": "string",
            "nickName": "string",
            "email": "string",
            "courses": [
                "string"
            ]
        }
    ]
},


]


export function CourseView() {
    const classManagement = useSelector((state) => state.classManagement);
    console.log(classManagement);


    const openFilters = useBoolean();
    const openCoursesCreateDialog = useBoolean();
    const filterState = useSetState({

    });
    const { state, setField } = useSetState({
        publish: 'all',
        search: '',
        sort: 'latest'
    });

    const handleTabChange = (event, newValue) => {
        setField('publish', newValue);
    }
    const handleSearch = (keyword) => {
        setField('search', keyword);
    }
    const handleSort = (sort) => {
        setField('sort', sort);
    }

    const renderFilterAndSort = () => {
        return (
            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems='end'>

                {/*  Sort By   */}
                <CourseSort sort={state.sort} sortOptions={SORT_OPTIONS} onSort={handleSort} />
                <CourseFilter open={openFilters.value} onOpen={openFilters.onTrue} onClose={openFilters.onFalse} />

            </Stack>
        );
    }

    const renderTabs = () => {
        return <Tabs value={state.publish} onChange={handleTabChange} sx={{ mb: { xs: 3, md: 3 } }}>
            {TABS_OPTIONS.map((tab) => (
                <Tab
                    key={tab.value}
                    iconPosition="end"
                    value={tab.value}
                    label={tab.label}
                    icon={
                        <Label
                            variant={((tab.value === 'all' || tab.value === state.publish) && 'filled') || 'soft'}
                            color={tab.color}
                        >

                        </Label>
                    }
                    sx={{ textTransform: 'capitalize' }}
                />
            ))}
        </Tabs>
    }


    useEffect(() => {
        // Fetch all courses
        ClassManagementActions.getAllCourses();
    },[])


    return (
        <DashboardContent maxWidth="xl">
            <CustomBreadcrumbs
                heading="Course"
                action={
                    <>
                        <Button
                            startIcon={<Iconify icon="mingcute:add-line" />}
                            variant="contained"
                            onClick={openCoursesCreateDialog.onTrue}
                        >
                            Add Course
                        </Button>
                        <CourseCreateDialog
                            open={openCoursesCreateDialog.value}
                            onClose={openCoursesCreateDialog.onFalse} />
                    </>

                }
                sx={{ mb: { xs: 3, md: 5 } }}
            />
            <Stack direction={'column'} spacing={2.5}>
                {renderFilterAndSort()}
                {renderTabs()}
                {<CourseList course={classManagement.courses} />}
            </Stack>

        </DashboardContent>
    )
}