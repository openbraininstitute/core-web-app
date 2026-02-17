import { Suspense } from 'react';

import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { TeamManager } from '@/ui/segments/project/team/team';
import { ProjectTeamSkeleton } from '@/ui/segments/project/team/team-skeleton';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Home({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext, null>) {
  const { virtualLabId, projectId } = await promisedParams;
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
    queryFn: () => listProjectMembers({ virtualLabId, projectId }),
  });

  return (
    <HydrateClient>
      <Suspense fallback={<ProjectTeamSkeleton />}>
        <div className="flex h-full w-full flex-col gap-6 p-3">
          <TeamManager />
        </div>
      </Suspense>
    </HydrateClient>
  );
}
