export const KEYCLOAK_PROVIDER_ID = 'keycloak';

export const LOG_IN_PATH = '/app/log-in';

export const AUTH_PROXY_REDIRECT_TARGET_COOKIE = 'auth-proxy-redirect-target';
export const AUTH_PROXY_REDIRECT_PATH = '/api/auth/redirect-after-signin';
export const PREVIEW_DOMAIN_SUFFIX = '.preview.openbraininstitute.org';

/** Cookies are shared by every app on a host (all ports of localhost, all previews of a domain): a prefix of our own keeps another Better Auth app's cookies from shadowing ours. */
export const AUTH_COOKIE_PREFIX = 'core-web-app';
/** How the session cookie is encoded; the proxy must decode it the same way. */
export const SESSION_COOKIE_STRATEGY = 'jwe';

/** A session unused for this long ends. */
export const SESSION_IDLE_TIMEOUT_S = 10 * 60 * 60;
/** The session cookie is re-issued at most once per hour of use. */
export const SESSION_COOKIE_REISSUE_S = SESSION_IDLE_TIMEOUT_S - 60 * 60;
/** A session ends this long after sign-in, however much it is used. */
export const SESSION_MAX_LIFETIME_S = 30 * 24 * 60 * 60;
export const SESSION_REFETCH_INTERVAL_S = 2 * 60;

/** Tasks that receive the access token cannot renew it, so it is renewed this long before it expires. */
export const ACCESS_TOKEN_RENEWAL_THRESHOLD_MS = 20 * 60 * 1000;
/** A renewed token set is reused this long for requests that still carry the cookie from before the renewal. */
export const REFRESH_REUSE_MS = 60 * 1000;
