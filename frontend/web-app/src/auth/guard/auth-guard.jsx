'use client';

import { getAccessToken, useUser } from '@auth0/nextjs-auth0';
import { useEffect, useState } from 'react';

import { useRouter } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';
import { setAxiosAuthToken } from 'src/lib/axios';

import { SplashScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

export function AuthGuard({ children }) {
  const router = useRouter();

  const { user, isLoading } = useUser();

  const [isChecking, setIsChecking] = useState(true);

  const checkPermissions = async () => {
    if (isLoading) {
      return;
    }

    if (!user) {
      // unauthenticated - redirect to login
      //const redirectPath = router.push();

      router.replace(CONFIG.auth.loginPath);

      return;
    }
    // authenticated - allow access
    // set token
    try {
      const token = await getAccessToken();
      const bearer = `Bearer ${token}`;
      console.log('bearer ', bearer);
      setAxiosAuthToken(token);
    }
    catch (_) {
      // Cannot delete __session cookie directly (it's HttpOnly)
      // Must use Auth0 logout endpoint to clear session
      router.replace('/auth/logout');
      return;
    }


    setIsChecking(false);
  };

  useEffect(() => {
    checkPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (isChecking) {
    return <SplashScreen />;
  }

  // do something with error

  return <>{children}</>;
}
