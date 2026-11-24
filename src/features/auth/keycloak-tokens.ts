import { getAccountCookie, setAccountCookie } from 'better-auth/cookies';

import { serverConfig as config } from '@/config/server';
import { log } from '@/utils/logger';

import { KEYCLOAK_PROVIDER_ID, REFRESH_REUSE_MS } from './constants';
import { isAccessTokenDue } from './helpers';
import {
  AuthSessionError,
  type TAccountTokens,
  type TEndpointContext,
  type TOAuthProvider,
  type TRefreshedTokens,
  type TTokenPair,
} from './types';

/**
 * One Keycloak call per refresh token. A page load asks for the session several times at once, and
 * requests that left the browser before the renewed cookie arrived still carry the old token:
 * using it again would be wasted, and refused by a realm that rotates refresh tokens.
 */
const refreshes = new Map<string, Promise<TRefreshedTokens>>();

function refreshOnce(provider: TOAuthProvider, refreshToken: string): Promise<TRefreshedTokens> {
  const known = refreshes.get(refreshToken);
  if (known) return known;
  if (!provider.refreshAccessToken) {
    return Promise.reject(new Error('the Keycloak provider cannot refresh tokens'));
  }
  const request = provider.refreshAccessToken(refreshToken);
  refreshes.set(refreshToken, request);
  request.then(
    () => setTimeout(() => refreshes.delete(refreshToken), REFRESH_REUSE_MS).unref(),
    () => refreshes.delete(refreshToken)
  );
  return request;
}

async function upsertRefreshTokenInAuthManager(accessToken: string, refreshToken: string) {
  try {
    const response = await fetch(`${config.AUTH_MANAGER_URL}/refresh-token`, {
      method: 'post',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) {
      log(
        'error',
        'auth-manager refresh-token upsert failed',
        response.status,
        await response.text()
      );
    }
  } catch (error) {
    log('error', 'failed to update refresh token for auth manager', error);
  }
}

/** The accounts renewed while answering a request, by that request's headers. */
const renewedAccounts = new WeakMap<Headers, Record<string, unknown>>();

/**
 * Writes the renewed tokens again once the request is answered: reading the session can re-issue
 * the cookies with the tokens the request came with, and the last cookie written wins.
 */
export async function keepRenewedAccount(ctx: TEndpointContext) {
  const renewed = ctx.headers && renewedAccounts.get(ctx.headers);
  if (renewed) await setAccountCookie(ctx, renewed);
}

/** Hands the refresh token to auth-manager, which renews access tokens for long-running tasks. */
export async function syncRefreshToken(tokens: TTokenPair | null) {
  if (!tokens?.accessToken || !tokens.refreshToken) return;
  const synced = upsertRefreshTokenInAuthManager(tokens.accessToken, tokens.refreshToken);
  // A preview deployment runs on Lambda, which freezes the request once the response is sent.
  if (config.DEPLOYMENT_ENV === 'preview') await synced;
}

/**
 * The Keycloak tokens of the signed-in account, renewed when they are about to expire.
 * `null` means the request carries no account of this user, so the user has to sign in again.
 */
export async function resolveAccountTokens(
  ctx: TEndpointContext,
  subject: string
): Promise<TAccountTokens | null> {
  const account = await getAccountCookie(ctx);
  // The session and the tokens travel in separate cookies: tokens of another account are never served.
  if (account?.accountId !== subject) return null;
  if (!account.accessToken || !account.accessTokenExpiresAt) return null;

  const current: TAccountTokens = {
    accessToken: account.accessToken,
    idToken: account.idToken ?? '',
    expiresAt: new Date(account.accessTokenExpiresAt),
  };
  if (!isAccessTokenDue(current.expiresAt)) return current;

  const provider = ctx.context.socialProviders.find(({ id }) => id === KEYCLOAK_PROVIDER_ID);
  if (!provider || !account.refreshToken) {
    return { ...current, error: AuthSessionError.RefreshAccessToken };
  }

  try {
    const refreshed = await refreshOnce(provider, account.refreshToken);
    if (!refreshed.accessToken || !refreshed.accessTokenExpiresAt) {
      throw new Error('Keycloak returned no access token');
    }
    const refreshToken = refreshed.refreshToken ?? account.refreshToken;
    const idToken = refreshed.idToken ?? account.idToken;

    const renewed = {
      ...account,
      accessToken: refreshed.accessToken,
      accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt ?? account.refreshTokenExpiresAt,
      idToken,
    };
    await setAccountCookie(ctx, renewed);
    if (ctx.headers) renewedAccounts.set(ctx.headers, renewed);
    await syncRefreshToken({ accessToken: refreshed.accessToken, refreshToken });

    return {
      accessToken: refreshed.accessToken,
      idToken: idToken ?? '',
      expiresAt: refreshed.accessTokenExpiresAt,
    };
  } catch (error) {
    log('error', 'failed to refresh the access token', error);
    return { ...current, error: AuthSessionError.RefreshAccessToken };
  }
}
