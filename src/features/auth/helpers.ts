import { ACCESS_TOKEN_RENEWAL_THRESHOLD_MS } from './constants';
import {
  AuthSessionError,
  AuthStatus,
  type TAccountTokens,
  type TAuthEnv,
  type TAuthSession,
  type TAuthStatus,
  type TStoredAuthUser,
} from './types';

/** The session the app reads: a user without usable tokens is marked as needing a new sign-in. */
export function toAuthSession(user: TStoredAuthUser, tokens: TAccountTokens | null): TAuthSession {
  return {
    user: {
      id: user.subject,
      name: user.name,
      email: user.email,
      username: user.username,
      identityProvider: user.identityProvider ?? undefined,
    },
    accessToken: tokens?.accessToken ?? '',
    idToken: tokens?.idToken ?? '',
    expires: (tokens?.expiresAt ?? new Date(0)).toISOString(),
    error: tokens ? tokens.error : AuthSessionError.RefreshAccessToken,
  };
}

export function isAccessTokenDue(expiresAt: Date, now = Date.now()): boolean {
  return expiresAt.getTime() - now <= ACCESS_TOKEN_RENEWAL_THRESHOLD_MS;
}

/** `undefined` means the server has not said yet whether there is a session. */
export function resolveAuthStatus(session: TAuthSession | null | undefined): TAuthStatus {
  if (session === undefined) return AuthStatus.Loading;
  return session ? AuthStatus.Authenticated : AuthStatus.Unauthenticated;
}

/** The cookie domain all preview deployments share with the auth proxy, e.g. `.preview.example.org`. */
export function getSharedCookieDomain(authProxyUrl: string): string {
  const labels = new URL(authProxyUrl).hostname.split('.');
  return `.${labels.slice(-3).join('.')}`;
}

/** The secret and public URL of the auth server; the `NEXTAUTH_*` names are still read as a fallback. */
export function resolveAuthEnv(env: TAuthEnv) {
  return {
    secret: env.BETTER_AUTH_SECRET ?? env.NEXTAUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL ?? env.NEXTAUTH_URL,
  };
}
