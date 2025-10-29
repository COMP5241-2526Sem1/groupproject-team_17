'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'src/routes/hooks';

import { getCookie } from 'minimal-shared/utils';

import { realtimeClassAPI } from 'src/api/api-function-call';
import { SplashScreen } from 'src/components/loading-screen';

import { useClassroomContext } from './classroom-context';

// ----------------------------------------------------------------------

export function ClassroomGuard({ children }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const classroomContext = useClassroomContext();
  const isMounted = useRef(true);
  const hasChecked = useRef(false); // Flag to prevent multiple checks

  useEffect(() => {
    // Cleanup function to track mount status
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Prevent multiple executions
    if (hasChecked.current) {
      //console.log('ClassroomGuard: Already checked, skipping');
      return;
    }

    const checkClassroomAccess = async () => {
      // Mark as checked immediately to prevent race conditions
      hasChecked.current = true;

      try {
        //console.log('ClassroomGuard: Starting check...');

        // 1. Check if already authenticated
        if (classroomContext.isAuthencated) {
          //console.log('ClassroomGuard: Already authenticated');
          setIsChecking(false);
          return;
        }

        // 2. Check for token in cookies
        const token = getCookie('classroom_join_token');

        if (!token) {
          //console.log('ClassroomGuard: No token found, redirecting to /classroom');
          // No token, redirect to classroom entry page
          if (isMounted.current) {
            router.push('/classroom');
            setIsChecking(false);
          }
          return;
        }

        //console.log('ClassroomGuard: Token found, validating...');

        // 3. Validate token with backend
        const res = await realtimeClassAPI.validateJoinToken({ token });

        // Check if component is still mounted
        if (!isMounted.current) {
          //console.log('ClassroomGuard: Component unmounted, aborting');
          return;
        }

        if (res?.code === 0 && res.data && res.data.course && res.data.student) {
          //console.log('ClassroomGuard: Token valid, updating context');
          // Token is valid, update context
          classroomContext.joinClassroom(res.data.course, res.data.student);
          classroomContext.setAuthencated(true);
          router.push(`/classroom/${res.data.course.courseId}`);
          setIsChecking(false);

        } else {
          //console.log('ClassroomGuard: Token invalid, redirecting');
          // Token invalid, clear and redirect
          router.push('/classroom');
          setIsChecking(false);
        }
      } catch (error) {
        console.error('ClassroomGuard: Check failed', error);

        // Only update state if component is still mounted
        if (isMounted.current) {
          router.push('/classroom');
          setIsChecking(false);
        }
      }
    };

    checkClassroomAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Show loading screen while checking
  if (isChecking) {
    return <SplashScreen />;
  }

  // Only render children if authenticated

  return <>{children}</>;
}

