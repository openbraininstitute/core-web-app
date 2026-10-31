'use client';

import { useAtom } from 'jotai';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { useSession } from '@/features/auth/client';
import sessionAtom from '@/features/auth/client/session-atom';
import { usePrevious } from '@/hooks/hooks';

import type { Session, SessionOrNull } from '@/features/auth/types';

export type { SessionOrNull };

// Matches the previous next-auth SessionProvider `refetchInterval` (2 min).
// Polling /get-session re-runs the server `customSession`, which renews the
// Keycloak access token when it nears expiry and re-syncs the auth-manager.
const SESSION_REFETCH_INTERVAL_MS = 2 * 60 * 1000;

/*
   Waits for useSessionState to set the session.
   useSessionState updates it to always have the latest token available.
*/
function initClientSession() {
  let sessionSet = false;
  let session: SessionOrNull = null;
  let resolvePromise: ((value: true) => void) | null = null;
  const sessionPromise = new Promise((r) => {
    resolvePromise = r;
  });

  return {
    async getSession() {
      if (session || sessionSet) return session;
      await sessionPromise;
      return session;
    },
    setSession(newSession: SessionOrNull) {
      session = newSession;
      sessionSet = true;
      if (resolvePromise) resolvePromise(true);
    },
  };
}

const { getSession: getClientSession, setSession } = initClientSession();

export { getClientSession };

export default function useSessionState() {
  const currentSession = useSession();
  const pathname = usePathname();
  const [session, setSessionState] = useAtom(sessionAtom);
  const previousSession = usePrevious(currentSession);

  setSession(currentSession?.data);

  // If user logs-out in another window refresh page, (middleware will redirect to login if in a secured page)
  if (currentSession?.status === 'unauthenticated' && previousSession?.status === 'authenticated') {
    window.location.reload();
  }

  useEffect(() => {
    if (currentSession?.status === 'unauthenticated') {
      setSessionState(null);
      return;
    }

    if (
      currentSession?.status !== 'authenticated' ||
      currentSession.data.accessToken === session?.accessToken
    )
      return;

    if (!session) {
      setSessionState(currentSession.data);
    } else {
      // This is a workaround not to cause data re-fetch when updating access token.
      // TODO: design a proper solution.
      Object.assign(session as Session, currentSession.data);
    }
  }, [session?.accessToken, currentSession, session, setSessionState]);

  useEffect(() => {
    if (currentSession?.data?.error !== 'RefreshAccessTokenError') return;
    // Route through /app/log-in so the proxy detour runs on preview deployments;
    // calling signIn() here would target the current host and bypass it.
    if (pathname === '/app/log-in') return;
    const target = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/app/log-in?callbackUrl=${encodeURIComponent(target)}`;
  }, [currentSession, pathname]);

  const { refetch } = currentSession;
  useEffect(() => {
    const intervalId = setInterval(() => refetch(), SESSION_REFETCH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [refetch]);
}
