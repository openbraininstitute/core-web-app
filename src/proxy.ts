import { type NextRequest, NextResponse } from 'next/server';
import nextAuthMiddleware, { type NextRequestWithAuth } from 'next-auth/middleware';

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

  '/api/newsletter',
  '/api/auth*',
  '/api/marketing',
  '/api/help*',
  '/api/version',
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
      return requestUrl === basePath || requestUrl.startsWith(`${basePath}/`); //eslint-disable-line
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
 * - delegates remaining routes to next-auth middleware for authentication.
 */
export async function proxy(request: NextRequest) {
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

  // If not authenticated redirect to Keycloak's login and if successful back to the originally requested page
  // Otherwise let them through
  return nextAuthMiddleware(request as NextRequestWithAuth);
}
