'use client';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback } from 'react';
import { useUser, getAccessToken } from '@auth0/nextjs-auth0';

import { AuthContext } from '../auth-context';

// ----------------------------------------------------------------------

/**
 * NOTE:
 * We only build demo at basic level.
 * Customer will need to do some extra handling yourself if you want to extend the logic and other features...
 */

export function AuthProvider({ children }) {
  const { user } = useUser();
  const { state, setState } = useSetState({ user: null, roles: [], token: null });

  const checkUserSession = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const roles = payload['role'] || [];
        setState({ user: payload, roles, token });
      }
    } catch {
      setState({ user: null, roles: [] });
    }
  }, [setState]);

  useEffect(() => {
    checkUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------------

  const memoizedValue = useMemo(
    () => ({
      user,
      token: state.token,
      roles: state.roles,
      checkUserSession,
    }),
    [checkUserSession, user, state.roles]
  );

  return <AuthContext value={memoizedValue}>{children}</AuthContext>;
}
