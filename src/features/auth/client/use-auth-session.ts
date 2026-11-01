'use client';

import { createContext, useContext } from 'react';

import { authClient } from '@/features/auth/client/auth-client';
import { AuthStatus } from '@/features/auth/constants';

import type { ISession, TSessionOrNull } from '@/features/auth/types';

export type TUseAuthSessionReturn = { refetch: () => void } & (
  | { data: ISession; status: typeof AuthStatus.Authenticated }
  | { data: null; status: typeof AuthStatus.Unauthenticated }
  | { data: null; status: typeof AuthStatus.Loading }
);

/**
 * The session the server rendered with (`auth()` in the app layout). `undefined` means no
 * provider above, so the hook falls back to Better Auth's own pending state.
 */
export const InitialSessionContext = createContext<TSessionOrNull | undefined>(undefined);

function toReturn(session: TSessionOrNull, refetch: () => void): TUseAuthSessionReturn {
  if (session) return { data: session, status: AuthStatus.Authenticated, refetch };
  return { data: null, status: AuthStatus.Unauthenticated, refetch };
}

/**
 * The one client-side entry point to the session: wraps Better Auth's `useSession`
 * and returns the `{ data, status }` shape the app consumes, so `status === AuthStatus.Authenticated`
 * narrows `data` to a non-null `ISession`. Also exposes `refetch` for the polling in `useSessionState`.
 * Components must use this instead of calling `authClient.useSession` directly.
 *
 * Better Auth's store reports its initial pending state during SSR and hydration, so the
 * server-fetched session (see `SessionStateProvider`) stands in until the client fetch settles.
 * This is the fallback pattern from the Better Auth client docs, applied once for the whole app.
 */
export function useAuthSession(): TUseAuthSessionReturn {
  const initialSession = useContext(InitialSessionContext);
  const { data, isPending, isRefetching, refetch } = authClient.useSession();

  if (isPending && !isRefetching) {
    if (initialSession !== undefined) return toReturn(initialSession, refetch);
    return { data: null, status: AuthStatus.Loading, refetch };
  }
  return toReturn((data as ISession | null) ?? null, refetch);
}
