import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { tryCatch } from '@/api/utils';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { DEFAULT_PAGE_SMALL_SIZE } from '@/constants';
import { makeRoles } from '@/hooks/use-user-membership';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { getProjectJobReports } from '@/services/virtual-lab/projects';
import { Credits } from '@/ui/segments/project/credits';
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
  const projectName = res?.name ?? 'Project';

  const title = `Project: ${projectName} - Credits | Open Brain Institute`;
  const description = `Manage credits and billing for ${projectName} on the Open Brain Institute.`;

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

export default async function CreditsPage({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext, null>) {
  const { virtualLabId, projectId } = await promisedParams;
  const queryClient = getQueryClient();

  try {
    const result = await queryClient.fetchQuery({
      queryKey: keyBuilder.membership(),
      queryFn: getUserGroups,
    });

    const { isProjectMember, isVirtualLabMember } = makeRoles(result, virtualLabId, projectId);
    if (!isProjectMember && !isVirtualLabMember) {
      throw new Error('User not allowed to access this page');
    }
  } catch {
    notFound();
  }

  queryClient.prefetchQuery({
    queryKey: keyBuilder.credits({
      virtualLabId,
      projectId,
      page: 1,
      pageSize: DEFAULT_PAGE_SMALL_SIZE,
    }),
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
