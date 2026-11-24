import type { TAuthSession } from './types';

/**
 * The signed-in user and their access token, or `null`. The one way to read the session outside
 * a React component: it works in server components, route handlers, server actions and the browser.
 */
export async function getAuthSession(): Promise<TAuthSession | null> {
  if (typeof window === 'undefined') {
    const { getServerAuthSession } = await import('./auth');
    return getServerAuthSession();
  }
  const { getClientAuthSession } = await import('./client');
  return getClientAuthSession();
}
