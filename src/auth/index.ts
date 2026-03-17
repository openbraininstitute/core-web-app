import { getServerSession, type NextAuthOptions, type Session, type TokenSet } from 'next-auth';

import { serverConfig as config } from '@/config/server';

import { log } from '../utils/logger';

import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';

const issuer = config.KEYCLOAK_ISSUER;
const clientId = config.KEYCLOAK_CLIENT_ID;
const clientSecret = config.KEYCLOAK_CLIENT_SECRET;

function getParentDomain(hostname: string): string {
  const parts = hostname.split('.');
  return parts.length > 2 ? parts.slice(-3).join('.') : hostname;
}

function getSharedCookieDomain(authProxyUrl: string): string {
  try {
    const proxyHostname = new URL(authProxyUrl).hostname;
    return `.${getParentDomain(proxyHostname)}`;
  } catch {
    log('error', 'Invalid AUTH_PROXY_URL', authProxyUrl);
    return '';
  }
}

/**
 * Updates or inserts a refresh token in the authentication manager service.
 *
 * This function sends the refresh token to the auth manager's refresh-token endpoint
 * to keep it synchronized with the current authentication state. It's called during
 * initial sign-in and token refresh operations to ensure the auth manager has
 * the latest refresh token available.
 *
 * @param accessToken - The current access token used for authorization with the auth manager
 * @param refreshToken - The refresh token to be stored/updated in the auth manager
 */
async function upsertRefreshTokenInAuthManager({
  accessToken,
  refreshToken,
}: {
  accessToken: string;
  refreshToken: string;
}) {
  try {
    const response = await fetch(`${config.AUTH_MANAGER_URL}/refresh-token`, {
      method: 'post',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });
    const result = await response.json();
    log('debug', 'update refresh token for auth manager succeed', result);
  } catch (error) {
    log('error', 'failed to update refresh token for auth manager', error);
  }
}

async function ensureUserRecord({ accessToken }: { accessToken: string }) {
  try {
    const response = await fetch(`${config.VIRTUAL_LAB_API_URL}/users`, {
      method: 'post',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
    });
    const result = await response.json();
    log('debug', 'update refresh token for auth manager succeed', result);
  } catch (error) {
    log('error', 'failed to update refresh token for auth manager', error);
  }
}

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
export async function refreshAccessToken(token: TokenSet) {
  try {
    const tokenUrl = `${issuer}/protocol/openid-connect/token`;

    const response = await fetch(tokenUrl, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }
    void (async () => {
      await upsertRefreshTokenInAuthManager({
        accessToken: refreshedTokens.access_token,
        refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      });
    })();

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    // TODO: log to Sentry once it's enabled
    log('error', error);

    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    {
      clientId,
      id: 'keycloak',
      name: 'Keycloak',
      type: 'oauth',

      // next-auth package requires clientSecret because it supports only confidential clients,
      // while Keycloak SBO client is configured to be public and doesn't require it.
      clientSecret,

      wellKnown: `${issuer}/.well-known/openid-configuration`,
      authorization: {
        params: {
          scope: 'profile openid groups',
        },
      },
      idToken: true,
      checks: ['pkce', 'state'],
      profile(profile) {
        return {
          name: profile.name,
          email: profile.email,
          username: profile.preferred_username,
          id: profile.sub,
        };
      },
    },
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Used for preview deployments to return back from the auth proxy
      if (config.AUTH_PROXY_URL) {
        const authProxyHostname = new URL(config.AUTH_PROXY_URL).hostname;
        const baseHostname = new URL(baseUrl).hostname;
        if (baseHostname === authProxyHostname && url.startsWith(baseUrl)) {
          return `${config.AUTH_PROXY_URL}/api/auth/redirect-after-signin`;
        }
      }
      return url;
    },
    async jwt({ token, account, user, profile }) {
      // Initial sign in

      if (account && user) {
        console.log('——— first signing');
        void (async () => {
          if (account?.access_token && account?.refresh_token)
            await upsertRefreshTokenInAuthManager({
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
            });
        })();
        void (async () => {
          if (account?.access_token && account?.refresh_token)
            await ensureUserRecord({
              accessToken: account.access_token,
            });
        })();

        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : null,
          refreshToken: account.refresh_token,
          user: {
            ...user,
            id: profile?.sub,
            // @ts-expect-error identity_provider is a Keycloak-specific claim
            identityProvider: profile?.identity_provider,
          },

          idToken: account.id_token,
        };
      }
      console.log('——— keep getting token');
      // Return previous token if the access token has not expired / is not close to expiration yet.
      if (
        typeof token.accessTokenExpires === 'number' &&
        Date.now() < token.accessTokenExpires - 2 * 60 * 1000
      ) {
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      return {
        user: {
          ...session.user,
          ...(token.user as Session['user']),
        },
        accessToken: token.accessToken as string,
        idToken: token.idToken,
        expires: new Date(token.accessTokenExpires as number).toISOString(),
        error: token.error as string,
      };
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 10 * 60 * 60, // 10 hours
  },
  cookies: config.AUTH_PROXY_URL
    ? {
        sessionToken: {
          name: '__Secure-next-auth.session-token',
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: true,
            domain: getSharedCookieDomain(config.AUTH_PROXY_URL),
          },
        },
        callbackUrl: {
          name: '__Secure-next-auth.callback-url',
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: true,
            domain: getSharedCookieDomain(config.AUTH_PROXY_URL),
          },
        },
        state: {
          name: '__Secure-next-auth.state',
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: true,
            domain: getSharedCookieDomain(config.AUTH_PROXY_URL),
          },
        },
      }
    : undefined,
  pages: {
    signIn: '/app/log-in',
  },
} satisfies NextAuthOptions;

function auth(
  ...args:
    | [GetServerSidePropsContext['req'], GetServerSidePropsContext['res']]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  return getServerSession(...args, authOptions);
}

export { auth };
