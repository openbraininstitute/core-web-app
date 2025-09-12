'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { isServer, ROOT_ROUTE } from '@/config';

export default function Page() {
  const searchParams = useSearchParams();

  const redirectURL = searchParams.get('callbackUrl');

  const onboarding = `${typeof window !== 'undefined' ? window.location.origin : ''}${ROOT_ROUTE}/sync?redirectUrl=${encodeURIComponent(redirectURL ?? '')}`;
  if (!isServer) signIn('keycloak', { callbackUrl: onboarding });

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <h2 className="text-primary-8 text-xl font-bold">Redirecting to secure login</h2>
      <p className="text-primary-7 mx-auto max-w-md text-center">
        Please wait while we redirect you to our secure authentication portal.
      </p>
    </div>
  );
}
