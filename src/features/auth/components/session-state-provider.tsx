'use client';

import { authClient } from '@/features/auth/client/auth-client';
import { InitialSessionContext } from '@/features/auth/client/use-auth-session';
import useSessionState from '@/features/auth/client/use-session-state';

import type { ReactNode } from 'react';
import type { TSessionOrNull } from '@/features/auth/types';

type TSessionStateWrapperProps = {
  children: ReactNode;
  /** Session the server rendered with, so the first client render is not a loading state. */
  initialSession: TSessionOrNull;
};

/** Runs the session side effects (cross-tab logout reload, refresh-error redirect, polling). */
function SessionState() {
  useSessionState();
  return null;
}

export default function SessionStateProvider({
  children,
  initialSession,
}: TSessionStateWrapperProps) {
  // Seeds Better Auth's store on the client; a no-op on the server, for `null`, and after the first call.
  authClient.hydrateSession(initialSession as Parameters<typeof authClient.hydrateSession>[0]);

  return (
    <InitialSessionContext value={initialSession}>
      <SessionState />
      {children}
    </InitialSessionContext>
  );
}
