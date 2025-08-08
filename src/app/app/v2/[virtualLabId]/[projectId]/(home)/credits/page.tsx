import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getProjectJobReports } from '@/services/virtual-lab/projects';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { Credits } from '@/ui/segments/project/credits';
import { keyBuilder } from '@/ui/user-query-keys/workspace';
import { makeRoles } from '@/hooks/use-user-role';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Home({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext, null>) {
  const { virtualLabId, projectId } = await promisedParams;
  const queryClient = getQueryClient();

  try {
    const result = await queryClient.fetchQuery({
      queryKey: keyBuilder.roles(),
      queryFn: getUserGroups,
    });

    // TODO: this should be fixed to allow virtual lab admin to see this page too
    // NOTE: change should be in virtual lab service
    const { isProjectAdmin } = makeRoles(result, virtualLabId, projectId);
    if (!isProjectAdmin) {
      throw new Error('User not allowed to access this page');
    }
  } catch (error) {
    notFound();
  }

  queryClient.prefetchQuery({
    queryKey: keyBuilder.credits({ virtualLabId, projectId, page: 1, pageSize: 10 }),
    queryFn: () => getProjectJobReports({ virtualLabId, projectId, page: 1 }),
  });

  return (
    <HydrateClient>
      <Suspense>
        <Credits />
      </Suspense>
    </HydrateClient>
  );
}
