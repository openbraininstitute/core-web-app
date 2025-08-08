'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

import {
  basePath,
  isServer,
  LATEST_VISITED_PROJECT_KEY,
  V2_MIGRATION_TEMPORARY_BASE_PATH,
} from '@/config';
import { useLocalStorage } from '@/hooks/use-local-storage';

export default function Page() {
  const searchParams = useSearchParams();
  const [store] = useLocalStorage<{
    virtualLabId: string;
    projectId: string;
  } | null>(LATEST_VISITED_PROJECT_KEY, null);

  const redirectURL = searchParams.get('callbackUrl');
  let finalRedirectURL = redirectURL;

  let latestVisitedProject = null;
  if (store && store.virtualLabId && store.projectId)
    latestVisitedProject = `${basePath}/${V2_MIGRATION_TEMPORARY_BASE_PATH}/${store.virtualLabId}/${store.projectId}`;

  if (redirectURL?.endsWith('/app/virtual-lab')) {
    finalRedirectURL = latestVisitedProject || redirectURL;
  }

  const onboarding = `/${V2_MIGRATION_TEMPORARY_BASE_PATH}/onboarding?redirectUrl=${encodeURIComponent(finalRedirectURL ?? '')}`;
  if (!isServer) signIn('keycloak', { callbackUrl: onboarding || basePath });

  return 'Logging in...';
}
