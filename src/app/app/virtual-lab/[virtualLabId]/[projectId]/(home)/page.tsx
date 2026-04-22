import { Suspense } from 'react';

import { tryCatch } from '@/api/utils';
import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { makeRoles } from '@/hooks/use-user-membership';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { getProjectJobReports } from '@/services/virtual-lab/projects';
import { Credits } from '@/ui/segments/project/credits';
import { ProjectHomeHeader } from '@/ui/segments/project/project-home-header';
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

  queryClient.prefetchQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
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
      <div className="flex h-full w-full flex-col gap-4 overflow-hidden p-3 pb-10 text-sm">
        <ProjectHomeHeader />
        <div className="flex w-full min-h-0 flex-1 gap-4">
          <div className="bg-[#e9e9e9] flex w-1/2 min-h-0 min-w-0 flex-col overflow-y-auto rounded-xl p-3">
            <Suspense fallback={<ProjectTeamSkeleton />}>
              <TeamManager />
            </Suspense>
          </div>
          {canViewCredits && (
            <div className="bg-[#e9e9e9] flex w-1/2 min-h-0 min-w-0 flex-col overflow-y-auto rounded-xl p-3">
              <Suspense>
                <Credits variant="light" />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </HydrateClient>
  );
}
