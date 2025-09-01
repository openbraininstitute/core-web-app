'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { basePath, isServer, V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { LATEST_VISITED_PROJECT_KEY } from '@/constants';

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

  const onboarding = `/${V2_MIGRATION_TEMPORARY_BASE_PATH}/sync?redirectUrl=${encodeURIComponent(finalRedirectURL ?? '')}`;
  if (!isServer) signIn('keycloak', { callbackUrl: onboarding || basePath });

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <h2 className="text-primary-8 text-xl font-bold">Redirecting to secure login</h2>
      <p className="text-primary-7 mx-auto max-w-md text-center">
        Please wait while we redirect you to our secure authentication portal.
      </p>
    </div>
  );
}
