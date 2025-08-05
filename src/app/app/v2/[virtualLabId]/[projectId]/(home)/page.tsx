import { Suspense } from 'react';

import { ProjectCardSkeletonShimmer } from '@/ui/segments/project/banner-skeleton';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { Shortcuts } from '@/ui/segments/project/bottom-nav-shortcuts';
import { ProjectActivities } from '@/ui/segments/project/activities';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { ProjectCard } from '@/ui/segments/project/banner';
import { keyBuilder } from '@/ui/queries/workspace';

import type { ServerSideComponentProp } from '@/types/common';

export default async function Home({
  params: promisedParams,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }, null>) {
  const { virtualLabId, projectId } = await promisedParams;
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: keyBuilder.getOne({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
  });

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6 p-3">
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
