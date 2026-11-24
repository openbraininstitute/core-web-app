import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { customSession } from 'better-auth/plugins/custom-session';
import { genericOAuth, keycloak } from 'better-auth/plugins/generic-oauth';
import { cache } from 'react';

import { serverConfig as config } from '@/config/server';

import {
  AUTH_COOKIE_PREFIX,
  SESSION_COOKIE_REISSUE_S,
  SESSION_COOKIE_STRATEGY,
  SESSION_IDLE_TIMEOUT_S,
  SESSION_MAX_LIFETIME_S,
} from './constants';
import { getSharedCookieDomain, resolveAuthEnv, toAuthSession } from './helpers';
import { keepRenewedAccount, resolveAccountTokens, syncRefreshToken } from './keycloak-tokens';

import type { TAuthSession, TKeycloakProfile } from './types';

/**
 * Filled from the Keycloak profile at sign-in. `subject` is the user id the app uses: without a
 * database Better Auth's own user id differs on every server instance.
 */
const userOptions = {
  user: {
    additionalFields: {
      subject: { type: 'string' },
      username: { type: 'string' },
      identityProvider: { type: 'string', required: false },
    },
  },
} as const;

/**
 * Keycloak owns the profile, so the endpoints that would let a user edit it are off. So are the
 * ones that return the Keycloak tokens to a script: the session already carries the access and ID
 * tokens the app needs, and the refresh token must never leave its encrypted cookie.
 */
const DISABLED_PATHS = [
  '/update-user',
  '/delete-user',
  '/change-email',
  '/link-social',
  '/unlink-account',
  '/refresh-token',
  '/get-access-token',
  '/account-info',
];

function createAuth() {
  const { secret, baseURL } = resolveAuthEnv(config);

  return betterAuth({
    ...userOptions,
    secret,
    baseURL,
    session: {
      expiresIn: SESSION_MAX_LIFETIME_S,
      cookieCache: {
        enabled: true,
        strategy: SESSION_COOKIE_STRATEGY,
        maxAge: SESSION_IDLE_TIMEOUT_S,
        refreshCache: { updateAge: SESSION_COOKIE_REISSUE_S },
      },
    },
    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      // Stated, as Better Auth otherwise skips its origin and callback URL checks when NODE_ENV is "test".
      disableOriginCheck: false,
      crossSubDomainCookies: config.AUTH_PROXY_URL
        ? { enabled: true, domain: getSharedCookieDomain(config.AUTH_PROXY_URL) }
        : undefined,
    },
    // Keycloak rate-limits sign-in itself; a limit per IP here would lock out a classroom behind one address.
    rateLimit: { enabled: false },
    disabledPaths: DISABLED_PATHS,
    // Without a database Better Auth still writes each sign-in to a store in the memory of this
    // process. These two hooks are where that store is visible: the first is the one place that
    // sees the tokens Keycloak returns at sign-in, the second empties the store once the cookies
    // hold the session, so the memory does not grow with every user who signs in.
    databaseHooks: {
      account: {
        create: { after: syncRefreshToken },
        update: { after: syncRefreshToken },
      },
    },
    hooks: {
      // The only way in is the redirect through Keycloak. Better Auth would also take an ID token
      // posted to the sign-in endpoint, which would turn a leaked ID token into a session.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/sign-in/social' && ctx.body?.idToken) {
          throw new APIError('BAD_REQUEST', {
            message: 'Sign-in with an ID token is not supported',
          });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        const signedIn = ctx.context.newSession;
        if (signedIn) await ctx.context.internalAdapter.deleteUser(signedIn.user.id);
        await keepRenewedAccount(ctx);
      }),
    },
    plugins: [
      genericOAuth({
        config: [
          {
            ...keycloak({
              clientId: config.KEYCLOAK_CLIENT_ID,
              clientSecret: config.KEYCLOAK_CLIENT_SECRET,
              issuer: config.KEYCLOAK_ISSUER,
              scopes: ['openid', 'profile', 'groups'],
              overrideUserInfo: true,
              // `keycloakLogout` ends the Keycloak session before the browser signs out here.
              disableProviderLogout: true,
            }),
            mapProfileToUser: (profile) => {
              const { sub, preferred_username, identity_provider } = profile as TKeycloakProfile;
              return {
                subject: sub,
                username: preferred_username,
                identityProvider: identity_provider,
              };
            },
          },
        ],
      }),
      customSession(
        async ({ user }, ctx) => toAuthSession(user, await resolveAccountTokens(ctx, user.subject)),
        userOptions
      ),
      nextCookies(),
    ],
  });
}

export type TAuth = ReturnType<typeof createAuth>;

const shared = globalThis as typeof globalThis & { coreWebAppAuth?: TAuth };
let ownAuth: TAuth | undefined;

/**
 * Created on first use, as the configuration is not readable while Next builds the app. In
 * production it is kept on `globalThis`: Next bundles this module once for server components and
 * once for the server render of client components, and both must share one instance. In
 * development each copy keeps its own, so that editing this file takes effect without a restart.
 */
export function getAuth(): TAuth {
  if (process.env.NODE_ENV !== 'production') {
    ownAuth ??= createAuth();
    return ownAuth;
  }
  shared.coreWebAppAuth ??= createAuth();
  return shared.coreWebAppAuth;
}

/** Once per render: a page, its layout and its data loaders all ask for the session. */
export const getServerAuthSession = cache(async (): Promise<TAuthSession | null> => {
  // A client component reaches this module when it renders on the server, where Next refuses a static import of `next/headers`.
  const { headers } = await import('next/headers');
  // Read first: it makes Next render the route per request, so a build never needs the auth instance.
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
});
