import { redirect } from 'next/navigation';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export const metadata = { title: `Dashboard - ${CONFIG.appName}` };

export default function Page() {
  // redirect to /dashboard/courses

  redirect('/dashboard/courses');
}
