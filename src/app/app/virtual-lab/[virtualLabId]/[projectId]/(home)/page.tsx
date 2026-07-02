import { tryCatch } from '@/api/utils';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getQueryClient } from '@/query-provider/server';
import { GetStartedCards } from '@/ui/segments/project/get-started/sections/get-started-cards';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { Metadata } from 'next';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export const dynamic = 'force-dynamic';

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
  const projectDescription = res?.description ?? '';

  const title = `Project: ${projectName} - Get Started | Open Brain Institute`;
  const description =
    projectDescription ||
    `Get started with ${projectName}. Access curated data, workflows, notebooks, and tutorials on the Open Brain Institute.`;

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

export default async function Page(_props: ServerSideComponentProp<WorkspaceContext, null>) {
  return (
    <div className="flex w-full flex-col gap-4 pr-2">
      <GetStartedCards />
    </div>
  );
}
