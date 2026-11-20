'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthSession } from '@/features/auth/client/use-auth-session';
import { AuthStatus, REFRESH_ACCESS_TOKEN_ERROR } from '@/features/auth/constants';
import { usePrevious } from '@/hooks/hooks';

export default function useSessionState() {
  const currentSession = useAuthSession();
  const pathname = usePathname();
  const previousSession = usePrevious(currentSession);

  const status = currentSession.status;
  const previousStatus = previousSession?.status;
  // If user logs-out in another window refresh page, (middleware will redirect to login if in a secured page)
  useEffect(() => {
    if (status === AuthStatus.Unauthenticated && previousStatus === AuthStatus.Authenticated) {
      window.location.reload();
    }
  }, [status, previousStatus]);

  useEffect(() => {
    if (currentSession.data?.error !== REFRESH_ACCESS_TOKEN_ERROR) return;
    // Route through /app/log-in so the proxy detour runs on preview deployments;
    // calling signIn() here would target the current host and bypass it.
    if (pathname === '/app/log-in') return;
    const target = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/app/log-in?callbackUrl=${encodeURIComponent(target)}`;
  }, [currentSession.data?.error, pathname]);
}
