'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthSession } from '@/features/auth/client';
import { LOG_IN_PATH } from '@/features/auth/constants';
import { AuthSessionError, AuthStatus } from '@/features/auth/types';
import { claimProjectDataCaches, disownProjectDataCaches } from '@/utils/project-data-caches';

import { usePrevious } from './hooks';

/** Reacts to the session changing under the page: a sign-out or another user in another tab, or tokens that can no longer be renewed. */
export default function useSessionState() {
  const currentSession = useAuthSession();
  const pathname = usePathname();
  const previousSession = usePrevious(currentSession);

  if (
    currentSession.status === AuthStatus.Unauthenticated &&
    previousSession?.status === AuthStatus.Authenticated
  ) {
    window.location.reload();
  }

  const userId = currentSession.data?.user.id;
  const previousUserId = previousSession?.data?.user.id;
  // Until now this tab could still write the first user's files into the caches the second one
  // claimed: forget their owner, so the claim after the reload deletes them again.
  if (userId && previousUserId && userId !== previousUserId) {
    disownProjectDataCaches();
    window.location.reload();
  }

  useEffect(() => {
    if (userId) claimProjectDataCaches(userId).catch(() => {});
  }, [userId]);

  const sessionError = currentSession.data?.error;
  useEffect(() => {
    if (sessionError !== AuthSessionError.RefreshAccessToken) return;
    // Through the log-in page, so that a preview deployment takes its detour through the auth proxy.
    if (pathname === LOG_IN_PATH) return;
    const target = `${window.location.pathname}${window.location.search}`;
    window.location.href = `${LOG_IN_PATH}?callbackUrl=${encodeURIComponent(target)}`;
  }, [sessionError, pathname]);
}
