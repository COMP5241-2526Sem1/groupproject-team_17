
// ----------------------------------------------------------------------

import { ClassroomProvider } from 'auth-classroom';
import { ClassroomGuard } from 'auth-classroom/classroom-guard';

import ClassroomLayout from "src/sections/realtime-class/class-room-layout";


export default function Layout({ children }) {


  return (
    <ClassroomProvider>
      <ClassroomGuard>
        <ClassroomLayout>
          {children}
        </ClassroomLayout>
      </ClassroomGuard>
    </ClassroomProvider>
  );
}
