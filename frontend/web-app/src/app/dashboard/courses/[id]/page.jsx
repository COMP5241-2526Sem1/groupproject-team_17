import { CONFIG } from 'src/global-config';

import CourseDetailsView from 'src/sections/course/view/course-details-view';

/* export async function generateMetadata({ params }) {
    const { id } = params;
    const path = API_ENDPOINTS.COURSE.GET_COURSE(id);
    const response = await fetch(`${CONFIG.serverUrl}${path}`, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
    console.log('Fetch response:', response);
    if (response.code === 0 && response.data) {
        const course = response.data;
        return {
            title: `${course.courseCode} - ${course.courseName} | Dashboard - ${CONFIG.appName}`,
            description: course.description || `Course details for ${course.courseCode}`,
            openGraph: {
                title: `${course.courseCode} - ${course.courseName}`,
                description: course.description,
            },
        };
    }

    return { title: `Course ${id} | Dashboard - ${CONFIG.appName}` };
}
 */
export const metadata = {
  title: `Course Details - ${CONFIG.appName}`,
};
export default function Page() {
  return <CourseDetailsView />;
}
