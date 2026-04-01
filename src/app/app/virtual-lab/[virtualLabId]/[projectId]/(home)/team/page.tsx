import { Suspense } from 'react';

import { tryCatch } from '@/api/utils';
import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { TeamManager } from '@/ui/segments/project/team/team';
import { ProjectTeamSkeleton } from '@/ui/segments/project/team/team-skeleton';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { Metadata } from 'next';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export async function generateMetadata({
  params,
}: ServerSideComponentProp<WorkspaceContext, null>): Promise<Metadata> {
  const { virtualLabId, projectId } = await params;
  const queryClient = getQueryClient();

  const { data: res } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
      queryFn: () => getProject({ virtualLabId, projectId }),
    })
  );
  const projectName = res?.data?.project?.name ?? 'Project';

  const title = `Project: ${projectName} - Members | Open Brain Institute`;
  const description = `View and manage team members for ${projectName} on the Open Brain Institute.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

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
