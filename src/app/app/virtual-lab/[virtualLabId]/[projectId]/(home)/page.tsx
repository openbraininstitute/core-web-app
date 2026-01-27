import { RedirectType, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { tryCatch } from '@/api/utils';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { config } from '@/config';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import type { ServerSideComponentProp } from '@/types/common';
import { ProjectActivities } from '@/ui/segments/project/activities';
import { ProjectCard } from '@/ui/segments/project/banner/banner';
import { ProjectCardSkeletonShimmer } from '@/ui/segments/project/banner/banner-skeleton';
import { Shortcuts } from '@/ui/segments/project/bottom-nav-shortcuts';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

export default async function Home({
  params: promisedParams,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }, null>) {
  const { virtualLabId, projectId } = await promisedParams;
  const queryClient = getQueryClient();

  const { data, error } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
      queryFn: () => getProject({ virtualLabId, projectId }),
    })
  );

  if (!data || error) {
    redirect(`${config.ROOT_ROUTE}/sync`, RedirectType.replace);
  }

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6 pr-1.5">
        <Suspense fallback={<ProjectCardSkeletonShimmer />}>
          <ProjectCard />
        </Suspense>
        <Suspense>
          <ProjectActivities />
        </Suspense>
        <Shortcuts />
      </div>
    </HydrateClient>
  );
}
