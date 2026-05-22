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

// `callbackUrl` is taken from the query string and is fully attacker-controlled.
// Anywhere we navigate to it directly (bypassing NextAuth's own checks) we must
// confirm it stays on this origin, otherwise `/app/log-in?callbackUrl=https://evil`
// becomes a silent open redirect for already-authenticated users.
function isSameOriginTarget(candidate: string): boolean {
  return parseCandidate(candidate)?.origin === window.location.origin;
}

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
    // Wait for the session probe so we don't trigger a redundant OAuth
    // round-trip for a user who already has a valid Keycloak session.
    if (session.status === 'loading') return;

    hasInitiated.current = true;

    if (session.status === 'authenticated') {
      const safeTarget = redirectURL && isSameOriginTarget(redirectURL) ? redirectURL : SYNC_PATH;
      window.location.replace(safeTarget);
      return;
    }

    // If the incoming `callbackUrl` already targets the sync page (from
    // `buildPlatformLoginUrl`, from NextAuth middleware intercepting an
    // unauthenticated sync visit, or from a prior wrap) pass it through
    // unchanged. Re-wrapping it adds another `?redirectUrl=` layer and
    // re-encodes every percent in the previous layer, which is what blows
    // the `__Secure-next-auth.callback-url` cookie past the upstream header
    // limit on repeated re-auth and ends in HTTP 431.
    const onboarding = `${window.location.origin}${SYNC_PATH}`;
    const callbackUrl = resolveCallbackUrl(redirectURL, onboarding);

    if (config.AUTH_PROXY_URL && !window.location.href.startsWith(config.AUTH_PROXY_URL)) {
      setAuthProxyRedirectCookie(callbackUrl);
      window.location.href = `${config.AUTH_PROXY_URL}/api/auth/signin/keycloak`;
    } else {
      signIn('keycloak', { callbackUrl });
    }
  }, [redirectURL, session.status]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <h2 className="text-primary-8 text-xl font-bold">Redirecting to secure login</h2>
      <p className="text-primary-7 mx-auto max-w-md text-center">
        Please wait while we redirect you to our secure authentication portal.
      </p>
    </div>
  );
}
