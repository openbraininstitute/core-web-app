'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { config } from '@/config';
import { signIn, useAuthSession } from '@/features/auth/client';
import {
  AUTH_PROXY_REDIRECT_TARGET_COOKIE,
  AuthStatus,
  PREVIEW_DOMAIN_SUFFIX,
} from '@/features/auth/constants';

const SYNC_PATH = `${config.ROOT_ROUTE}/sync`;

function setAuthProxyRedirectCookie(url: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: Enable auth for preview deployments with only one subdomain registered in Keycloak as redirect_uri
  document.cookie = `${AUTH_PROXY_REDIRECT_TARGET_COOKIE}=${encodeURIComponent(url)}; path=/; domain=${PREVIEW_DOMAIN_SUFFIX}; secure; samesite=lax`;
}

function hasAuthProxyRedirectCookie(): boolean {
  return document.cookie
    .split('; ')
    .some((c) => c.startsWith(`${AUTH_PROXY_REDIRECT_TARGET_COOKIE}=`));
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

export function LoginRedirect() {
  const searchParams = useSearchParams();
  const session = useAuthSession();
  const hasInitiated = useRef(false);
  const [failed, setFailed] = useState(false);

  const redirectURL = searchParams.get('callbackUrl');

  useEffect(() => {
    if (hasInitiated.current) return;
    // Wait for the session probe to skip a redundant OAuth round-trip for an SSO'd user.
    if (session.status === AuthStatus.Loading) return;

    hasInitiated.current = true;

    // A 'RefreshAccessTokenError' session decrypts as authenticated but can't
    // mint fresh access tokens — fall through to re-auth instead of bouncing.
    if (session.status === AuthStatus.Authenticated && !session.data?.error) {
      const safeTarget = redirectURL && isSameOriginTarget(redirectURL) ? redirectURL : SYNC_PATH;
      window.location.replace(safeTarget);
      return;
    }

    const onboarding = `${window.location.origin}${SYNC_PATH}`;
    const callbackUrl = resolveCallbackUrl(redirectURL, onboarding);

    const onProxyHost =
      !!config.AUTH_PROXY_URL && window.location.href.startsWith(config.AUTH_PROXY_URL);

    if (config.AUTH_PROXY_URL && !onProxyHost) {
      // Preview subdomain: stash the final target in a shared-domain cookie and
      // continue the OAuth handshake on the proxy deployment — the only host
      // registered as a Keycloak redirect URI.
      setAuthProxyRedirectCookie(callbackUrl);
      window.location.href = `${config.AUTH_PROXY_URL}${config.ROOT_ROUTE}/log-in`;
    } else if (config.AUTH_PROXY_URL && onProxyHost && hasAuthProxyRedirectCookie()) {
      // On the proxy deployment with a stashed target: sign in, then return through
      // redirect-after-signin, which reads the cookie and bounces back to the original subdomain.
      // Without the cookie the user signed in directly on the proxy host: use their own target.
      startSignIn(`${config.AUTH_PROXY_URL}/api/auth/redirect-after-signin`);
    } else {
      startSignIn(callbackUrl);
    }

    async function startSignIn(target: string) {
      const result = await signIn('keycloak', { callbackUrl: target });
      // Better Auth returns errors (e.g. a 403 for an untrusted callback) instead of throwing;
      // without this the page would sit on "Redirecting" forever.
      if (result?.error) setFailed(true);
    }
  }, [redirectURL, session.status, session.data?.error]);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <h2 className="text-primary-8 text-xl font-bold">Sign-in could not start</h2>
        <a className="text-primary-7 underline" href={`${config.ROOT_ROUTE}/log-in`}>
          Try again
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <h2 className="text-primary-8 text-xl font-bold">Redirecting to secure login</h2>
      <p className="text-primary-7 mx-auto max-w-md text-center">
        Please wait while we redirect you to our secure authentication portal.
      </p>
    </div>
  );
}
