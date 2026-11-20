'use client';

import { authClient } from '@/features/auth/client/auth-client';
import { KEYCLOAK_PROVIDER_ID } from '@/features/auth/constants';

export { authClient } from '@/features/auth/client/auth-client';
export {
  type TUseAuthSessionReturn,
  useAuthSession,
} from '@/features/auth/client/use-auth-session';

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
