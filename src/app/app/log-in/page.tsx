'use client';

import { useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

import { AUTH_PROXY_REDIRECT_TARGET_COOKIE, PREVIEW_DOMAIN_SUFFIX } from '@/auth/constants';
import { config } from '@/config';

const SYNC_PATH = `${config.ROOT_ROUTE}/sync`;

function setAuthProxyRedirectCookie(url: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: Enable auth for preview deployments with only one subdomain registered in Keycloak as redirect_uri
  document.cookie = `${AUTH_PROXY_REDIRECT_TARGET_COOKIE}=${encodeURIComponent(url)}; path=/; domain=${PREVIEW_DOMAIN_SUFFIX}; secure; samesite=lax`;
}

function parseCandidate(candidate: string): URL | null {
  try {
    return candidate.startsWith('http')
      ? new URL(candidate)
      : new URL(candidate, window.location.origin);
  } catch {
    return null;
  }
}

function isSyncTarget(candidate: string): boolean {
  return parseCandidate(candidate)?.pathname === SYNC_PATH;
}

// Guard same-origin to avoid an open redirect, as `callbackUrl` might be attacker-controlled.
function isSameOriginTarget(candidate: string): boolean {
  return parseCandidate(candidate)?.origin === window.location.origin;
}

// Pass sync-targeted URLs through unchanged; re-wrapping them under `?redirectUrl=`
// grows `__Secure-next-auth.callback-url` on every re-auth until it hits 431.
function resolveCallbackUrl(redirectURL: string | null, onboarding: string): string {
  if (!redirectURL) return onboarding;
  if (isSyncTarget(redirectURL)) {
    return redirectURL.startsWith('http') ? redirectURL : `${window.location.origin}${redirectURL}`;
  }
  return `${onboarding}?redirectUrl=${encodeURIComponent(redirectURL)}`;
}

export default function Page() {
  const searchParams = useSearchParams();
  const session = useSession();
  const hasInitiated = useRef(false);

  const redirectURL = searchParams.get('callbackUrl');

  useEffect(() => {
    if (hasInitiated.current) return;
    // Wait for the session probe to skip a redundant OAuth round-trip for an SSO'd user.
    if (session.status === 'loading') return;

    hasInitiated.current = true;

    // A 'RefreshAccessTokenError' session decrypts as authenticated but can't
    // mint fresh access tokens — fall through to re-auth instead of bouncing.
    if (session.status === 'authenticated' && !session.data?.error) {
      const safeTarget = redirectURL && isSameOriginTarget(redirectURL) ? redirectURL : SYNC_PATH;
      window.location.replace(safeTarget);
      return;
    }

    const onboarding = `${window.location.origin}${SYNC_PATH}`;
    const callbackUrl = resolveCallbackUrl(redirectURL, onboarding);

    if (config.AUTH_PROXY_URL && !window.location.href.startsWith(config.AUTH_PROXY_URL)) {
      setAuthProxyRedirectCookie(callbackUrl);
      window.location.href = `${config.AUTH_PROXY_URL}/api/auth/signin/keycloak`;
    } else {
      signIn('keycloak', { callbackUrl });
    }
  }, [redirectURL, session.status, session.data?.error]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <h2 className="text-primary-8 text-xl font-bold">Redirecting to secure login</h2>
      <p className="text-primary-7 mx-auto max-w-md text-center">
        Please wait while we redirect you to our secure authentication portal.
      </p>
    </div>
  );
}
