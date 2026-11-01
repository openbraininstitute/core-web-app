'use client';

import { authClient } from '@/features/auth/client/auth-client';
import { AuthStatus } from '@/features/auth/constants';

import type { ISession } from '@/features/auth/types';

export type TUseAuthSessionReturn = { refetch: () => void } & (
  | { data: ISession; status: typeof AuthStatus.Authenticated }
  | { data: null; status: typeof AuthStatus.Unauthenticated }
  | { data: null; status: typeof AuthStatus.Loading }
);

/**
 * The one client-side entry point to the session: wraps Better Auth's `useSession`
 * and returns the `{ data, status }` shape the app consumes, so `status === AuthStatus.Authenticated`
 * narrows `data` to a non-null `ISession`. Also exposes `refetch` for the polling in `useSessionState`.
 * Components must use this instead of calling `authClient.useSession` directly.
 */
export function useAuthSession(): TUseAuthSessionReturn {
  const { data, isPending, refetch } = authClient.useSession();
  const session = (data as ISession | null) ?? null;
  if (isPending) return { data: null, status: AuthStatus.Loading, refetch };
  if (session) return { data: session, status: AuthStatus.Authenticated, refetch };
  return { data: null, status: AuthStatus.Unauthenticated, refetch };
}
