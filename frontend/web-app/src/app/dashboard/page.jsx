import { CONFIG } from 'src/global-config';
import { CourseView } from 'src/sections/course/view/course-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <CourseView />;
}
