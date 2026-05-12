import { tryCatch } from '@/api/utils';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getQueryClient } from '@/query-provider/server';
import { MainCards } from '@/ui/segments/project/get-started/sections/quick-access';
import { TutorialList } from '@/ui/segments/project/get-started/sections/tutorials';
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
  const projectName = res?.data?.name ?? 'Project';
  const projectDescription = res?.data?.description ?? '';

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

export default async function Page(props: ServerSideComponentProp<WorkspaceContext, null>) {
  const context = await props.params;
  return (
    <div className="w-full flex flex-col pr-2">
      <MainCards context={context} />
      <TutorialList />
    </div>
  );
}
