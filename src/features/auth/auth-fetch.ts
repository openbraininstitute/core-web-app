import { isServer } from '@/config';
import { authClient } from '@/features/auth/client/auth-client';
import { retry } from '@/util/retry';

import type { TSessionOrNull } from '@/features/auth/types';

/**
  Gets the current session, fresh on every call (never cached here).
  Works server and client side.
*/
export async function getSession(): Promise<TSessionOrNull> {
  if (!isServer) {
    const { data, error } = await authClient.getSession();
    if (error) throw error;
    return (data as TSessionOrNull) ?? null;
  }

  // Only import if running on server
  const { auth } = await import('@/features/auth/server');

  return await auth();
}

/**
  Adds Authorization header with the accessToken, and calls fetch.
  See fetch for call signature: https://developer.mozilla.org/fr/docs/Web/API/fetch
*/
export async function authFetchWithoutRetry(
  ...args: Parameters<typeof fetch>
): ReturnType<typeof fetch> {
  const session = await getSession();
  if (!session) return fetch(...args); // If no active session fetch, for use in unauthenticated routes

  const init = args[1] || {};
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Authorization'))
    headers.append('Authorization', `Bearer ${session.accessToken}`);

  init.headers = headers;

  const newArgs: typeof args = [args[0], init];
  return fetch(...newArgs); // If there is an active session set Authorization and fetch
}

export const authFetch = retry()(authFetchWithoutRetry); // Only retry on exceptions
export default authFetch;

export const authFetchRetryOnError = retry({
  shouldRetryOnError: (status: number) => status > 405,
})(authFetchWithoutRetry); // Retry on exceptions or error statuses > 405
