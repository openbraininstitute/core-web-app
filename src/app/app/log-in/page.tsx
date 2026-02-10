'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useEffect } from 'react';

import { config } from '@/config';

function setAuthProxyRedirectCookie(url: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: Enable auth for preview deployments with only one subdomain registered in Keycloak as redirect_uri
  document.cookie = `preview-return-to=${encodeURIComponent(url)}; path=/; domain=.preview.openbraininstitute.org; secure; samesite=lax`;
}

export default function Page() {
  const searchParams = useSearchParams();

  const redirectURL = searchParams.get('callbackUrl');

  useEffect(() => {
    const onboarding = `${window.location.origin}${config.ROOT_ROUTE}/sync?redirectUrl=${encodeURIComponent(redirectURL ?? '')}`;

    if (config.AUTH_PROXY_URL && !window.location.href.startsWith(config.AUTH_PROXY_URL)) {
      setAuthProxyRedirectCookie(onboarding);
      window.location.href = `${config.AUTH_PROXY_URL}/api/auth/signin/keycloak`;
    } else {
      signIn('keycloak', { callbackUrl: onboarding });
    }
  }, [redirectURL]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <h2 className="text-primary-8 text-xl font-bold">Redirecting to secure login</h2>
      <p className="text-primary-7 mx-auto max-w-md text-center">
        Please wait while we redirect you to our secure authentication portal.
      </p>
    </div>
  );
}
