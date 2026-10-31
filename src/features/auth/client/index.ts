'use client';

import { customSessionClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { KEYCLOAK_PROVIDER_ID } from '@/features/auth/constants';

import type { Session } from '@/features/auth/types';

// Type-only reference to the server instance so `customSessionClient` infers the
// reshaped session returned by `customSession`. `import type` keeps the server
// module (and its `next/headers` imports) out of the client bundle.
type ServerAuth = typeof import('@/features/auth/server').serverAuth;

export const authClient = createAuthClient({
  plugins: [customSessionClient<ServerAuth>()],
});

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

type UseSessionReturn =
  | { data: Session; status: 'authenticated'; refetch: () => void }
  | { data: null; status: 'unauthenticated'; refetch: () => void }
  | { data: null; status: 'loading'; refetch: () => void };

/**
 * Drop-in replacement for next-auth's `useSession`, returning the same
 * discriminated `{ data, status }` shape (so `status === 'authenticated'`
 * narrows `data` to a non-null `Session`) and the legacy `Session` object, so
 * existing consumers work unchanged. Also exposes `refetch` for the polling in
 * `useSessionState` (the old SessionProvider `refetchInterval`).
 */
export function useSession(): UseSessionReturn {
  const { data, isPending, refetch } = authClient.useSession();
  const session = (data as Session | null) ?? null;
  if (isPending) return { data: null, status: 'loading', refetch };
  if (session) return { data: session, status: 'authenticated', refetch };
  return { data: null, status: 'unauthenticated', refetch };
}

/**
 * Drop-in replacement for next-auth's `signIn('keycloak', { callbackUrl })`.
 * Initiates the Keycloak OAuth2 flow and redirects the browser.
 */
export async function signIn(
  provider: string = KEYCLOAK_PROVIDER_ID,
  options?: { callbackUrl?: string }
) {
  // Since Better Auth 1.7 generic-OAuth providers sign in through the core social endpoint.
  const result = await authClient.signIn.social({
    provider,
    callbackURL: options?.callbackUrl,
  });
  // If the client returned the provider URL without auto-redirecting, do it.
  const url = (result?.data as { url?: string } | undefined)?.url;
  if (url) window.location.href = url;
  return result;
}

/**
 * Drop-in replacement for next-auth's `signOut({ callbackUrl })`.
 */
export async function signOut(options?: { callbackUrl?: string }) {
  await authClient.signOut();
  if (options?.callbackUrl) window.location.href = options.callbackUrl;
}
