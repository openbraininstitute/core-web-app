'use client';

import { useAtom } from 'jotai';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

import sessionAtom from '@/state/session';
import { claimProjectDataCaches, disownProjectDataCaches } from '@/utils/project-data-caches';

import { usePrevious } from './hooks';

import type { Session } from 'next-auth';

export type SessionOrNull = Session | null;

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

  const userId =
    currentSession?.status === 'authenticated' ? currentSession.data.user?.id : undefined;
  const previousUserId =
    previousSession?.status === 'authenticated' ? previousSession.data.user?.id : undefined;
  // Another user signed in from another window. Until now this tab could still write the first
  // user's files into the caches the second one claimed: forget their owner, so the claim after
  // the reload deletes them again.
  if (userId && previousUserId && userId !== previousUserId) {
    disownProjectDataCaches();
    window.location.reload();
  }

  useEffect(() => {
    if (userId) claimProjectDataCaches(userId).catch(() => {});
  }, [userId]);

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
}
