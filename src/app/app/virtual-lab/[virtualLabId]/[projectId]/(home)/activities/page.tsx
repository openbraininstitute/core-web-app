import { RedirectType, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { tryCatch } from '@/api/utils';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { config } from '@/config';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { ProjectActivities } from '@/ui/segments/project/activities';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { Metadata } from 'next';
import type { ServerSideComponentProp } from '@/types/common';

export async function generateMetadata({
  params,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }, null>): Promise<Metadata> {
  const { virtualLabId, projectId } = await params;
  const queryClient = getQueryClient();

  const { data: res } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
      queryFn: () => getProject({ virtualLabId, projectId }),
    })
  );
  const projectName = res?.data?.name ?? 'Project';

  const title = `Project: ${projectName} - Activities | Open Brain Institute`;
  const description = `View and manage activities for ${projectName} on the Open Brain Institute.`;

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
      <div className="flex flex-col gap-6 pr-1.5 h-full">
        <Suspense>
          <ProjectActivities />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
