import { Suspense } from 'react';

import { tryCatch } from '@/api/utils';
import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { makeRoles } from '@/hooks/use-user-membership';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { getProjectJobReports } from '@/services/virtual-lab/projects';
import { Credits } from '@/ui/segments/project/credits';
import { TeamManager } from '@/ui/segments/project/team/team';
import { ProjectTeamSkeleton } from '@/ui/segments/project/team/team-skeleton';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext, null>) {
  const { virtualLabId, projectId } = await promisedParams;
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
    queryFn: () => listProjectMembers({ virtualLabId, projectId }),
  });

  const { data: membership } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilder.membership(),
      queryFn: getUserGroups,
    })
  );
  const { isVirtualLabAdmin, isProjectAdmin } = membership
    ? makeRoles(membership, virtualLabId, projectId)
    : { isVirtualLabAdmin: false, isProjectAdmin: false };
  const canViewCredits = isVirtualLabAdmin || isProjectAdmin;

  if (canViewCredits) {
    queryClient.prefetchQuery({
      queryKey: keyBuilder.credits({ virtualLabId, projectId, page: 1, pageSize: 10 }),
      queryFn: () => getProjectJobReports({ virtualLabId, projectId, page: 1 }),
    });
  }

  return (
    <HydrateClient>
      <div className="flex h-full w-full flex-col gap-8 overflow-y-auto p-3 pb-10">
        <Suspense fallback={<ProjectTeamSkeleton />}>
          <TeamManager />
        </Suspense>
        {canViewCredits && (
          <Suspense>
            <Credits />
          </Suspense>
        )}
      </div>
    </HydrateClient>
  );
}
