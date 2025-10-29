'use client';

import { useParams } from 'next/navigation';

import { InstructorWebSocketProvider } from 'src/contexts/instructor-websocket-provider';

// ----------------------------------------------------------------------

export default function CourseLayout({ children }) {
  const params = useParams();
  const courseId = params?.id;

  return (
    <InstructorWebSocketProvider courseId={courseId} enabled={!!courseId}>
      {children}
    </InstructorWebSocketProvider>
  );
}
