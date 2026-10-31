import { serverConfig as config } from '@/config/server';
import { log } from '@/utils/logger';

export { KEYCLOAK_PROVIDER_ID, REFRESH_ACCESS_TOKEN_ERROR } from '@/features/auth/constants';

/**
 * Keycloak / auth-manager helpers for the Better Auth server instance.
 * Server-only — imports `serverConfig`. Client code should use `@/auth/constants`.
 */

// TODO: Lower this back to minutes after all tasks
// (circuit simulations, mesh skeletonization) support token renewal via auth-manager.
export const ACCESS_TOKEN_RENEWAL_THRESHOLD = 20 * 60 * 1000; // 20 minutes

// On Amplify preview (Lambda), fire-and-forget fetches may be killed when the
// execution context freezes after the response is sent. Await the auth-manager
// upsert so the refresh token is stored before the request returns.
export const shouldAwaitAuthManagerSync = config.DEPLOYMENT_ENV === 'preview';

function getParentDomain(hostname: string): string {
  const parts = hostname.split('.');
  return parts.length > 2 ? parts.slice(-3).join('.') : hostname;
}

/**
 * Derives the shared cookie domain (e.g. `.preview.openbraininstitute.org`)
 * from the auth-proxy URL so the session cookie is readable across all preview
 * subdomains. Returns an empty string on an invalid URL.
 */
export function getSharedCookieDomain(authProxyUrl: string): string {
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
 * Sent during initial sign-in and on every token refresh to keep the auth
 * manager's stored refresh token synchronized with the current session, so
 * long-running backend tasks can renew tokens on the user's behalf.
 *
 * @param accessToken - current access token, used to authorize the auth-manager call
 * @param refreshToken - refresh token to store/update in the auth manager
 */
export async function upsertRefreshTokenInAuthManager({
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
    if (!response.ok) {
      log(
        'error',
        'auth-manager refresh-token upsert failed',
        response.status,
        await response.text()
      );
      return;
    }
    const result = await response.json();
    log('debug', 'update refresh token for auth manager succeed', result);
  } catch (error) {
    log('error', 'failed to update refresh token for auth manager', error);
  }
}
