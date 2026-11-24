'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { config } from '@/config';
import { signInWithKeycloak, useAuthSession } from '@/features/auth/client';
import {
  AUTH_PROXY_REDIRECT_PATH,
  AUTH_PROXY_REDIRECT_TARGET_COOKIE,
  LOG_IN_PATH,
  PREVIEW_DOMAIN_SUFFIX,
} from '@/features/auth/constants';
import { AuthStatus } from '@/features/auth/types';
import { log } from '@/utils/logger';

const SYNC_PATH = `${config.ROOT_ROUTE}/sync`;

function setAuthProxyRedirectCookie(url: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: Enable auth for preview deployments with only one subdomain registered in Keycloak as redirect_uri
  document.cookie = `${AUTH_PROXY_REDIRECT_TARGET_COOKIE}=${encodeURIComponent(url)}; path=/; domain=${PREVIEW_DOMAIN_SUFFIX}; secure; samesite=lax`;
}

function hasAuthProxyRedirectCookie(): boolean {
  return document.cookie
    .split('; ')
    .some((cookie) => cookie.startsWith(`${AUTH_PROXY_REDIRECT_TARGET_COOKIE}=`));
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
// grows the callback URL on every re-auth until the request headers hit 431.
function resolveCallbackUrl(redirectURL: string | null, onboarding: string): string {
  if (!redirectURL) return onboarding;
  if (isSyncTarget(redirectURL)) {
    return redirectURL.startsWith('http') ? redirectURL : `${window.location.origin}${redirectURL}`;
  }
  return `${onboarding}?redirectUrl=${encodeURIComponent(redirectURL)}`;
}

export default function Page() {
  const searchParams = useSearchParams();
  const session = useAuthSession();
  const hasInitiated = useRef(false);

  const redirectURL = searchParams.get('callbackUrl');
  const reauth = searchParams.get('reauth') === '1';

  useEffect(() => {
    if (hasInitiated.current) return;
    // Wait for the session probe to skip a redundant OAuth round-trip for an SSO'd user.
    if (session.status === AuthStatus.Loading) return;

    hasInitiated.current = true;

    const onAuthProxy =
      !!config.AUTH_PROXY_URL && window.location.href.startsWith(config.AUTH_PROXY_URL);
    // A preview deployment sent the user here to sign in: always finish that detour.
    const returnsToPreview = onAuthProxy && hasAuthProxyRedirectCookie();

    // A session with an error is signed in but can't mint fresh access tokens — fall through
    // to re-auth instead of bouncing. `reauth=1` asks for the same when a service has rejected the token.
    if (
      session.status === AuthStatus.Authenticated &&
      !session.data?.error &&
      !reauth &&
      !returnsToPreview
    ) {
      const safeTarget = redirectURL && isSameOriginTarget(redirectURL) ? redirectURL : SYNC_PATH;
      window.location.replace(safeTarget);
      return;
    }

    const onboarding = `${window.location.origin}${SYNC_PATH}`;
    const callbackUrl = resolveCallbackUrl(redirectURL, onboarding);

    if (config.AUTH_PROXY_URL && !onAuthProxy) {
      setAuthProxyRedirectCookie(callbackUrl);
      window.location.href = `${config.AUTH_PROXY_URL}${LOG_IN_PATH}`;
      return;
    }

    signInWithKeycloak(returnsToPreview ? AUTH_PROXY_REDIRECT_PATH : callbackUrl).catch((error) =>
      log('error', 'sign-in could not start', error)
    );
  }, [redirectURL, reauth, session.status, session.data?.error]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <h2 className="text-primary-8 text-xl font-bold">Redirecting to secure login</h2>
      <p className="text-primary-7 mx-auto max-w-md text-center">
        Please wait while we redirect you to our secure authentication portal.
      </p>
    </div>
  );
}
