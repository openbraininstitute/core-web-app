import { getCookieCache } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

import {
  AUTH_COOKIE_PREFIX,
  LOG_IN_PATH,
  SESSION_COOKIE_STRATEGY,
} from '@/features/auth/constants';
import { getSharedCookieDomain, resolveAuthEnv } from '@/features/auth/helpers';

const { PRIMARY_HOSTNAME } = process.env;

const FREE_ACCESS_PAGES = [
  '/',
  '/home',
  '/about',
  '/mission',
  '/news*',
  '/pricing',
  '/team',
  '/resources',
  '/notebooks',
  '/contact',
  '/features',
  '/showcases',
  '/features/*',
  '/showcases/*',
  '/terms',
  '/privacy',
  '/financing',
  '/coming-soon',
  '/sfn-2025',
  '/the-real-digital-brain-story',
  '/app/documentation',
  '/app/documentation/*',
  '/gallery',
  '/gallery/*',
  '/app/version',
  '/app/log-in',
  '/app/grading/launch',
  '/app/grading/launch/error',

  '/api/newsletter',
  '/api/auth*',
  '/api/marketing',
  '/api/help*',
  '/api/version',
  '/api/feedback/create-ticket',
];
const ASSETS = [
  '/static*',
  '/images*',
  '/downloads*',
  '/_next*',
  '/favicon.ico',
  '/video*',
  '*.map',
];

/**
 * Checks whether a request pathname is allowed to pass without auth/redirect.
 *
 * Don't allow arbitrary regex to avoid accidentally leaking protected pages.
 * Three patterns are supported in `paths`:
 * - Exact match: '/path'
 * - Prefix match: '/path*' (matches '/path' and all subroutes like '/path/...')
 * - Suffix match: '*.ext' (matches any file ending with '.ext')
 *
 * @param requestUrl - The request pathname (e.g. '/_next/static/...').
 * @param paths - List of allowed route patterns (exact, prefix, or suffix).
 * @returns true if the request matches any allowed pattern; otherwise false.
 */
function isFreeAccessRoute(requestUrl: string, paths: string[]) {
  return paths.some((p) => {
    if (p.startsWith('*')) {
      // Suffix match (e.g., '*.map' matches any file ending with '.map')
      const suffix = p.slice(1);
      return requestUrl.endsWith(suffix);
    }
    if (p.endsWith('*')) {
      // Remove the trailing '*' to get the base path
      const basePath = p.slice(0, -1);
      // Matches basePath or all subroutes
      return requestUrl === basePath || requestUrl.startsWith(basePath);
    }
    return p === requestUrl;
  });
}

/**
 * removes the first non-root segment from a pathname to support URLs
 * prefixed with a version segment (e.g., '/43a61ce3/_next/...').
 *
 * examples:
 * - '/'                       -> '/'
 * - '/43a61ce3/_next/...'     -> '/_next/...'
 * - '/v2/images/logo.png'     -> '/images/logo.png'
 *
 * @param pathname - original request pathname.
 * @returns the pathname without the first segment; '/' when only one segment exists.
 */
function stripFirstPathSegment(pathname: string): string {
  if (!pathname || pathname === '/') return pathname;
  const nextSlashIndex = pathname.indexOf('/', 1);
  if (nextSlashIndex === -1) return '/';
  const stripped = pathname.slice(nextSlashIndex);
  return stripped.length === 0 ? '/' : stripped;
}

/**
 * global middleware pipeline
 *
 * - bypasses redirects for static assets (supports version-prefixed paths).
 * - enforces `PRIMARY_HOSTNAME` on non-asset routes by redirecting to the canonical host.
 * - allows free-access application and API routes as configured.
 * - sends a request without a valid session cookie to the log-in page, which returns to the requested page.
 * - expires the cookies next-auth left in the browser.
 */
export async function proxy(request: NextRequest) {
  return expireLegacyCookies(request, await route(request));
}

async function route(request: NextRequest) {
  const requestPathname = request.nextUrl.pathname;
  const pathnameWithoutLeadingSegment = stripFirstPathSegment(requestPathname);

  // Allow free access to assets (supports optional leading version segment like "/<version>/...")
  if (
    isFreeAccessRoute(requestPathname, ASSETS) ||
    isFreeAccessRoute(pathnameWithoutLeadingSegment, ASSETS)
  ) {
    return NextResponse.next();
  }

  // Primary hostname redirect
  // TODO: remove after redirect is implemented on infra side
  if (PRIMARY_HOSTNAME) {
    const host = request.headers.get('host');
    const url = request.nextUrl.clone();
    if (host !== PRIMARY_HOSTNAME) {
      url.hostname = PRIMARY_HOSTNAME;
      url.port = '443';
      url.protocol = 'https';
      return NextResponse.redirect(url);
    }
  }

  // Rest of the existing middleware code...
  const requestUrl = request.nextUrl.pathname;

  // const { device } = userAgent(request);

  // Allow free access to assets
  if (isFreeAccessRoute(requestUrl, ASSETS)) {
    return NextResponse.next();
  }

  // Let them through if they're trying to access a public page
  if (isFreeAccessRoute(requestUrl, FREE_ACCESS_PAGES)) {
    return NextResponse.next();
  }

  if (await hasSession(request)) return NextResponse.next();

  const logInUrl = new URL(LOG_IN_PATH, request.nextUrl);
  logInUrl.searchParams.set('callbackUrl', `${requestUrl}${request.nextUrl.search}`);
  return NextResponse.redirect(logInUrl);
}

const LEGACY_COOKIE = /^(__Secure-|__Host-)?next-auth\.[\w.-]+$/;

/**
 * A browser that was signed in with next-auth still sends its cookies for up to ten hours. With
 * the new ones they overflow the 16 KB of request headers Node accepts, and sign-in fails with a 431.
 */
function expireLegacyCookies(request: NextRequest, response: NextResponse): NextResponse {
  if (!request.headers.get('cookie')?.includes('next-auth.')) return response;

  const { AUTH_PROXY_URL } = process.env;
  const sharedDomain = AUTH_PROXY_URL ? `; Domain=${getSharedCookieDomain(AUTH_PROXY_URL)}` : null;
  for (const { name } of request.cookies.getAll()) {
    if (!LEGACY_COOKIE.test(name)) continue;
    const expired = `${name}=; Max-Age=0; Path=/${name.startsWith('__') ? '; Secure' : ''}`;
    response.headers.append('set-cookie', expired);
    if (sharedDomain && !name.startsWith('__Host-')) {
      response.headers.append('set-cookie', `${expired}${sharedDomain}`);
    }
  }
  return response;
}

/** Decrypts the session cookie: no network call, so every request can afford it. */
async function hasSession(request: NextRequest): Promise<boolean> {
  const { BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXTAUTH_SECRET, NEXTAUTH_URL } = process.env;
  const { secret, baseURL } = resolveAuthEnv({
    BETTER_AUTH_SECRET,
    BETTER_AUTH_URL,
    NEXTAUTH_SECRET,
    NEXTAUTH_URL,
  });
  const session = await getCookieCache(request, {
    secret,
    strategy: SESSION_COOKIE_STRATEGY,
    cookiePrefix: AUTH_COOKIE_PREFIX,
    isSecure: baseURL?.startsWith('https://') ?? false,
  }).catch(() => null);
  return session !== null;
}
