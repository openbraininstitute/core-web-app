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

  // Build the fallback from config, not `request.url` — under Amplify Lambda
  // the latter resolves to the function's internal binding, not the public host.
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
