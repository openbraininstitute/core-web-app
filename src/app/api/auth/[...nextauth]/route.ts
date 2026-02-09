import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';

import { authOptions } from '@/auth';
import { serverConfig as config } from '@/config/server';

const handler = NextAuth(authOptions);

async function GET(req: NextRequest) {
  const authProxyUrl = config.AUTH_PROXY_URL;
  const url = new URL(req.url);
  
  if (authProxyUrl && url.pathname === '/api/auth/signin') {
    const proxyUrl = new URL(authProxyUrl);
    const isCurrentProxy = url.hostname === proxyUrl.hostname;
    
    if (!isCurrentProxy) {
      const callbackUrl = url.searchParams.get('callbackUrl');
      if (callbackUrl && callbackUrl.startsWith('/')) {
        const protocol = req.headers.get('x-forwarded-proto') || 'https';
        const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.hostname;
        const fullCallbackUrl = `${protocol}://${host}${callbackUrl}`;
        return NextResponse.redirect(
          `${authProxyUrl}/api/auth/signin?callbackUrl=${encodeURIComponent(fullCallbackUrl)}`,
          { status: 302 }
        );
      }
    }
  }
  
  return handler(req);
}

async function POST(req: NextRequest) {
  return handler(req);
}

export { GET, POST };
