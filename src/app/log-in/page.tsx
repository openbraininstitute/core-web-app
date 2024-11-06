'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { basePath, isServer } from '@/config';

export default function Page() {
  const searchParams = useSearchParams();
  const redirectURL = searchParams.get('callbackUrl');
  const source = searchParams.get('source');

  if (!isServer) {
    if (source === 'dev') {
      signIn('keycloak', { callbackUrl: redirectURL || `${basePath}/dev` });
    } else {
      signIn('keycloak', { callbackUrl: redirectURL || basePath });
    }
  }

  return 'Logging in...';
}
