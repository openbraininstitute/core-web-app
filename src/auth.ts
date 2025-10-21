import 'server-only';

import { type NextAuthOptions, type Session } from 'next-auth';
import { type JWT } from 'next-auth/jwt';

import { log } from '@/utils/logger';
import { env } from '@/env';

const issuer = env.KEYCLOAK_ISSUER;
const clientId = env.KEYCLOAK_CLIENT_ID;
const clientSecret = env.KEYCLOAK_CLIENT_SECRET;

declare module 'next-auth/jwt' {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number | null;
    refreshToken?: string;
    idToken?: string;
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      username?: string | null;
    };
    error?: string;
  }
}

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
export async function refreshAccessToken(token: JWT): Promise<JWT> {
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

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }
    log('info', '[token.refreshed]', {
      component: 'NextAuth',
      operation: 'refreshAccessToken',
      userId: token.user?.id,
    });

    const newRefreshToken = result.refresh_token ?? token.refreshToken;

    if (token.user?.id) {
      try {
        const { upsertRefreshTokenToVault } = await import(
          '@/services/auth-manager/use-cases/upsert-refresh-only'
        );
        upsertRefreshTokenToVault({
          refreshToken: newRefreshToken,
          userId: token.user.id,
          sessionState: result.session_state,
          metadata: {
            name: token.user.name,
            lastRefresh: new Date().toISOString(),
          },
        });
      } catch (err) {
        // don't fail the refresh if vault update fails
        log('error', 'vault.error', {
          component: 'NextAuth',
          operation: 'upsertRefreshToken',
          userId: token.user?.id,
        });
      }
    }

    return {
      ...token,
      accessToken: result.access_token,
      accessTokenExpires: Date.now() + result.expires_in * 1000,
      refreshToken: newRefreshToken, // Fall back to old refresh token
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
    async jwt({ token, account, user, profile }) {
      // Initial sign in
      if (account && user) {
        if (account.refresh_token && profile?.sub) {
          try {
            const { upsertRefreshTokenToVault } = await import(
              '@/services/auth-manager/use-cases/upsert-refresh-only'
            );
            await upsertRefreshTokenToVault({
              refreshToken: account.refresh_token,
              userId: profile?.sub || user.id,
              sessionState: account.session_state,
              metadata: {
                name: profile?.name,
                provider: account.provider,
                loginTime: new Date().toISOString(),
              },
            });
          } catch (err) {
            log('error', 'vault.error', {
              component: 'NextAuth',
              operation: 'upsertRefreshToken',
              userId: profile?.sub || user.id,
            });
          }
        }

        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : null,
          refreshToken: account.refresh_token,
          user: {
            ...user,
            id: profile?.sub || user.id,
          },

          idToken: account.id_token,
        };
      }

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
  pages: {
    signIn: '/app/log-in',
  },
} satisfies NextAuthOptions;
