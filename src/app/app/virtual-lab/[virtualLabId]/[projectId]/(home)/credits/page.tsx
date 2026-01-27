import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { makeRoles } from '@/hooks/use-user-role';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { getProjectJobReports } from '@/services/virtual-lab/projects';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { Credits } from '@/ui/segments/project/credits';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

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

    const { isVirtualLabAdmin: isAdmin } = makeRoles(result, virtualLabId, projectId);
    if (!isAdmin) {
      throw new Error('User not allowed to access this page');
    }
  } catch (_error) {
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
