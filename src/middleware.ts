import nextAuthMiddleware, { NextRequestWithAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

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
  '/contact',
  '/terms',
  '/privacy',
  '/financing',
  '/coming-soon',
  '/the-real-digital-brain-story',

  '/app/log-in',

  '/api/newsletter',
  '/api/auth*',
  '/api/marketing',
];
const ASSETS = ['/static*', '/images*', '/downloads*', '/_next*', '/favicon.ico', '/video*'];

/* Don't allow arbitrary regex to avoid accidentally leaking protected pages
Only two patterns allowed, exact match or /path* which matches the path
and all sub-routes
*/
function isFreeAccessRoute(requestUrl: string, paths: string[]) {
  return paths.some((p) => {
    if (p.endsWith('*')) {
      // Remove the trailing '*' to get the base path
      const basePath = p.slice(0, -1);
      // Matches basePath or all subroutes
      return requestUrl === basePath || requestUrl.startsWith(basePath + '/'); //eslint-disable-line
    }
    return p === requestUrl;
  });
}

export async function middleware(request: NextRequest) {
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
