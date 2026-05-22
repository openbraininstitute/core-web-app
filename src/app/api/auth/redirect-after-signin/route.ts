import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_PROXY_REDIRECT_TARGET_COOKIE, PREVIEW_DOMAIN_SUFFIX } from '@/auth/constants';
import { serverConfig } from '@/config/server';

export async function GET() {
  const cookieStore = await cookies();
  const returnTo = cookieStore.get(AUTH_PROXY_REDIRECT_TARGET_COOKIE)?.value;

  if (returnTo && isValidPreviewDomain(returnTo)) {
    const response = NextResponse.redirect(returnTo);
    response.cookies.delete(AUTH_PROXY_REDIRECT_TARGET_COOKIE);
    return response;
  }

  // Fall back to the auth-proxy URL from config, not `request.url`. Under
  // Amplify Lambda, `request.url` reflects the function's internal binding
  // (e.g. `https://localhost:3000`) rather than the public host, so building
  // the fallback off the request would redirect the browser to localhost.
  // `AUTH_PROXY_URL` is guaranteed at runtime on preview (this route is only
  // reachable through the preview detour), but the schema marks it optional,
  // so guard the construction.
  if (!serverConfig.AUTH_PROXY_URL) {
    return new NextResponse('Auth proxy is not configured', { status: 500 });
  }
  const fallbackUrl = new URL('/app', serverConfig.AUTH_PROXY_URL);
  const response = NextResponse.redirect(fallbackUrl);
  response.cookies.delete(AUTH_PROXY_REDIRECT_TARGET_COOKIE);
  return response;
}

function isValidPreviewDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith(PREVIEW_DOMAIN_SUFFIX);
  } catch {
    return false;
  }
}
