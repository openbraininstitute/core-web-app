'use client';

import { useLayoutEffect } from 'react';

import { hydrateAuthSession, ServerSessionContext } from './client';

import type { TAuthSessionProviderProps } from './types';

/** Gives the page the session the server rendered it with, so nothing renders signed out first. */
export function AuthSessionProvider({ session, children }: TAuthSessionProviderProps) {
  useLayoutEffect(() => {
    hydrateAuthSession(session);
  }, [session]);

  return <ServerSessionContext value={session}>{children}</ServerSessionContext>;
}
