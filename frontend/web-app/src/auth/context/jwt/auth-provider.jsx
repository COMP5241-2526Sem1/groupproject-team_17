'use client';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback } from 'react';
import { AuthContext } from '../auth-context';
import { getAccessToken, useUser } from '@auth0/nextjs-auth0';


// ----------------------------------------------------------------------

/**
 * NOTE:
 * We only build demo at basic level.
 * Customer will need to do some extra handling yourself if you want to extend the logic and other features...
 */

export function AuthProvider({ children }) {
  const { user } = useUser();
  const { state, setState } = useSetState({ user: null , roles: []});
  
  const checkUserSession = useCallback(async () => {
    const token = await getAccessToken();
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const roles = payload['role'] || [];
      setState({ user: payload, roles });
    }
  }, [setState]);

  useEffect(() => {
    checkUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------------

  const memoizedValue = useMemo(
    () => ({
      user: user,
      roles: state.roles,
      checkUserSession,
    }),
    [checkUserSession, user, state.roles]
  );

  return <AuthContext value={memoizedValue}>{children}</AuthContext>;
}
