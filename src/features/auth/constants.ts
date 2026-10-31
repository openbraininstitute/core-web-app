export const AUTH_PROXY_REDIRECT_TARGET_COOKIE = 'auth-proxy-redirect-target';

export const PREVIEW_DOMAIN_SUFFIX = '.preview.openbraininstitute.org';

// Client-safe constants (no serverConfig access) so they can be imported from
// both the server auth instance and the client adapter without pulling
// `keycloak-sync` — which reads server-only env — into the client bundle.
export const KEYCLOAK_PROVIDER_ID = 'keycloak';

/** Error flag surfaced on the session when a Keycloak refresh fails; the client
 * relies on it to redirect to log-in. */
export const REFRESH_ACCESS_TOKEN_ERROR = 'RefreshAccessTokenError';
