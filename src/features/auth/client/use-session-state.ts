'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthSession } from '@/features/auth/client/use-auth-session';
import { AuthStatus, REFRESH_ACCESS_TOKEN_ERROR } from '@/features/auth/constants';
import { usePrevious } from '@/hooks/hooks';

// Matches the previous next-auth SessionProvider `refetchInterval` (2 min).
// Polling /get-session re-runs the server `customSession`, which renews the
// Keycloak access token when it nears expiry and re-syncs the auth-manager.
const SESSION_REFETCH_INTERVAL_MS = 2 * 60 * 1000;

export default function useSessionState() {
  const currentSession = useAuthSession();
  const pathname = usePathname();
  const previousSession = usePrevious(currentSession);

  // If user logs-out in another window refresh page, (middleware will redirect to login if in a secured page)
  if (
    currentSession.status === AuthStatus.Unauthenticated &&
    previousSession?.status === AuthStatus.Authenticated
  ) {
    window.location.reload();
  }

  useEffect(() => {
    if (currentSession.data?.error !== REFRESH_ACCESS_TOKEN_ERROR) return;
    // Route through /app/log-in so the proxy detour runs on preview deployments;
    // calling signIn() here would target the current host and bypass it.
    if (pathname === '/app/log-in') return;
    const target = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/app/log-in?callbackUrl=${encodeURIComponent(target)}`;
  }, [currentSession.data?.error, pathname]);

  const { refetch } = currentSession;
  useEffect(() => {
    const intervalId = setInterval(() => refetch(), SESSION_REFETCH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [refetch]);
}
