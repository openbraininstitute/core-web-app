import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { customSession, genericOAuth } from 'better-auth/plugins';

import { serverConfig as config } from '@/config/server';
import {
  ACCESS_TOKEN_RENEWAL_THRESHOLD,
  getSharedCookieDomain,
  KEYCLOAK_PROVIDER_ID,
  REFRESH_ACCESS_TOKEN_ERROR,
  shouldAwaitAuthManagerSync,
  upsertRefreshTokenInAuthManager,
} from '@/features/auth/server/keycloak-sync';
import { log } from '@/utils/logger';

import type { OAuth2Tokens } from 'better-auth/oauth2';
import type { Session } from '@/features/auth/types';

export type { Session, SessionOrNull, SessionUser } from '@/features/auth/types';

const issuer = config.KEYCLOAK_ISSUER;
const clientId = config.KEYCLOAK_CLIENT_ID;
const clientSecret = config.KEYCLOAK_CLIENT_SECRET;

const sharedCookieDomain = config.AUTH_PROXY_URL
  ? getSharedCookieDomain(config.AUTH_PROXY_URL)
  : undefined;

/**
 * Replaces the default OIDC user-info fetch so we can (1) fire the **initial**
 * auth-manager refresh-token sync with the freshly minted tokens — the one
 * place in the flow where the raw Keycloak tokens are available — and (2) spread
 * the raw claims so `mapProfileToUser` can read Keycloak-specific fields
 * (`preferred_username`, `identity_provider`).
 */
async function getKeycloakUserInfo(tokens: OAuth2Tokens) {
  if (tokens.accessToken && tokens.refreshToken) {
    const syncing = upsertRefreshTokenInAuthManager({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    if (shouldAwaitAuthManagerSync) await syncing;
  }

  const response = await fetch(`${issuer}/protocol/openid-connect/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  if (!response.ok) {
    log('error', 'keycloak userinfo fetch failed', response.status);
    return null;
  }
  const profile = await response.json();
  return {
    ...profile,
    id: profile.sub,
    email: profile.email,
    emailVerified: profile.email_verified ?? false,
    image: profile.picture,
    name: profile.name,
  };
}

/**
 * Reshapes Better Auth's `{ user, session }` into the legacy next-auth `Session`
 * shape the app's ~35 consumers depend on, and keeps the Keycloak access token
 * fresh. Runs on every `/get-session` (the client polls every 2 min), mirroring
 * the old next-auth `jwt` callback: refreshes the access token when it is within
 * {@link ACCESS_TOKEN_RENEWAL_THRESHOLD} of expiry and re-syncs the auth-manager.
 */
async function toLegacySession(user: Record<string, unknown>): Promise<Session> {
  // Lazy import to avoid a TDZ on `serverAuth` (defined below) and to keep
  // `next/headers` out of any client-reachable import graph.
  const { headers } = await import('next/headers');
  const requestHeaders = await headers();

  let accessToken = '';
  let idToken = '';
  let error: string | undefined;

  try {
    const current = await serverAuth.api.getAccessToken({
      // Better Auth 1.7 selects the OAuth account explicitly; stateless mode keeps it in a signed cookie.
      body: { useAccountCookie: true },
      headers: requestHeaders,
    });
    accessToken = current.accessToken ?? '';
    idToken = current.idToken ?? '';

    const expiresAtMs = current.accessTokenExpiresAt
      ? new Date(current.accessTokenExpiresAt).getTime()
      : 0;
    const withinRenewalWindow =
      expiresAtMs > 0 && Date.now() > expiresAtMs - ACCESS_TOKEN_RENEWAL_THRESHOLD;

    if (withinRenewalWindow) {
      try {
        const refreshed = await serverAuth.api.refreshToken({
          // Better Auth 1.7 selects the OAuth account explicitly; stateless mode keeps it in a signed cookie.
          body: { useAccountCookie: true },
          headers: requestHeaders,
        });
        accessToken = refreshed.accessToken ?? accessToken;
        idToken = refreshed.idToken ?? idToken;
        if (refreshed.accessToken && refreshed.refreshToken) {
          const syncing = upsertRefreshTokenInAuthManager({
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
          });
          if (shouldAwaitAuthManagerSync) await syncing;
        }
      } catch (refreshError) {
        // A refresh may fail because Keycloak rejected the refresh token, OR
        // because this ran in an RSC where cookies can't be written. Only flag
        // the session as broken when the token is actually past expiry; a still
        // valid token is served as-is and the next route-handler poll refreshes.
        if (Date.now() >= expiresAtMs) error = REFRESH_ACCESS_TOKEN_ERROR;
        log('error', 'keycloak token refresh failed', refreshError);
      }
    }
  } catch (tokenError) {
    error = REFRESH_ACCESS_TOKEN_ERROR;
    log('error', 'failed to resolve keycloak access token', tokenError);
  }

  return {
    user: {
      id: (user.id as string) ?? '',
      name: (user.name as string) ?? '',
      email: (user.email as string) ?? '',
      username: (user.username as string) ?? '',
      identityProvider: user.identityProvider as string | undefined,
      plan: user.plan as string[] | undefined,
    },
    accessToken,
    idToken,
    ...(error ? { error } : {}),
  };
}

export const serverAuth = betterAuth({
  // No `database`: stateless / cookie-only mode. Better Auth stores the OAuth
  // account (encrypted tokens) in a cookie and the session in a JWE cookie
  // cache — mirroring the previous next-auth JWT strategy with zero new infra.
  appName: 'OBI Core Web App',
  // `secret` and `baseURL` are read from BETTER_AUTH_SECRET / BETTER_AUTH_URL.
  session: {
    expiresIn: 10 * 60 * 60, // 10 hours, matching the legacy maxAge
  },
  // Identity comes only from Keycloak; the additional user fields below are not `input: false`
  // (that would strip them from the OAuth profile), so block the endpoint that could write them.
  disabledPaths: ['/update-user'],
  user: {
    additionalFields: {
      username: { type: 'string', required: false },
      identityProvider: { type: 'string', required: false },
    },
  },
  account: {
    // Belt-and-braces: stateless mode enables this automatically, but make the
    // OAuth-token-in-cookie behaviour explicit.
    storeAccountCookie: true,
  },
  advanced: {
    // Share the session/account cookies across preview subdomains so auth works
    // on `*.preview.openbraininstitute.org` behind the single registered
    // Keycloak redirect URI. Only enabled on preview (AUTH_PROXY_URL set).
    ...(sharedCookieDomain
      ? {
          useSecureCookies: true,
          crossSubDomainCookies: { enabled: true, domain: sharedCookieDomain },
        }
      : {}),
  },
  trustedOrigins: [
    ...(config.AUTH_PROXY_URL
      ? [config.AUTH_PROXY_URL, 'https://*.preview.openbraininstitute.org']
      : []),
  ],
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: KEYCLOAK_PROVIDER_ID,
          clientId,
          clientSecret,
          discoveryUrl: `${issuer}/.well-known/openid-configuration`,
          scopes: ['openid', 'profile', 'groups'],
          pkce: true,
          getUserInfo: getKeycloakUserInfo,
          mapProfileToUser: (profile) => ({
            // No `id`: since Better Auth 1.7 the provider identity is the account subject (`sub`, returned by getUserInfo).
            email: profile.email,
            name: profile.name,
            username: profile.preferred_username,
            identityProvider: profile.identity_provider,
          }),
        },
      ],
    }),
    customSession(async ({ user }) => toLegacySession(user as Record<string, unknown>)),
    // Must be the last plugin so cookies set inside server actions persist.
    nextCookies(),
  ],
});

/**
 * Server-side session accessor returning the legacy `Session` shape.
 * Drop-in replacement for the previous next-auth `auth()` (getServerSession).
 * Used by `auth-fetch`, route handlers, server actions and RSC.
 */
export async function auth(): Promise<Session | null> {
  const { headers } = await import('next/headers');
  const session = await serverAuth.api.getSession({ headers: await headers() });
  return (session as Session | null) ?? null;
}
