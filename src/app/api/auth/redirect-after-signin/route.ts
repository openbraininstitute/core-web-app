import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_PROXY_REDIRECT_TARGET_COOKIE } from '@/auth';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const returnTo = cookieStore.get(AUTH_PROXY_REDIRECT_TARGET_COOKIE)?.value;
  const requestUrl = new URL(request.url);

  if (returnTo && isValidPreviewDomain(returnTo)) {
    const response = NextResponse.redirect(returnTo);
    response.cookies.delete(AUTH_PROXY_REDIRECT_TARGET_COOKIE);
    return response;
  }

  const fallbackUrl = new URL('/app', requestUrl.origin);
  const response = NextResponse.redirect(fallbackUrl);
  response.cookies.delete(AUTH_PROXY_REDIRECT_TARGET_COOKIE);
  return response;
}

function isValidPreviewDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.preview.openbraininstitute.org');
  } catch {
    return false;
  }
}
