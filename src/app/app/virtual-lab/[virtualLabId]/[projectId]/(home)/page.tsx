import { redirect, RedirectType } from 'next/navigation';
import { Suspense } from 'react';

import { ProjectCardSkeletonShimmer } from '@/ui/segments/project/banner/banner-skeleton';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { Shortcuts } from '@/ui/segments/project/bottom-nav-shortcuts';
import { ProjectActivities } from '@/ui/segments/project/activities';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { ProjectCard } from '@/ui/segments/project/banner/banner';
import { ROOT_ROUTE } from '@/config';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { tryCatch } from '@/api/utils';

import type { ServerSideComponentProp } from '@/types/common';

export default async function Home({
  params: promisedParams,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }, null>) {
  const { virtualLabId, projectId } = await promisedParams;
  const queryClient = getQueryClient();

  const { data, error } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilder.getOne({ virtualLabId, projectId }),
      queryFn: () => getProject({ virtualLabId, projectId }),
    })
  );

  if (!data || error) {
    redirect(`${ROOT_ROUTE}/sync`, RedirectType.replace);
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
