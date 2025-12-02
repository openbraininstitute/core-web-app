import type { ReactNode } from 'react';

import { WorkflowSimulateLayout } from '@/ui/layouts/workflow-simulate-layout';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { getMEModel } from '@/api/entitycore/queries';

import type { ServerSideLayoutProp, WorkspaceContext } from '@/types/common';

export default async function Layout({
  params,
  children,
}: ServerSideLayoutProp<WorkspaceContext & { id: string }> & { children: ReactNode }) {
  const queryClient = getQueryClient();
  const { virtualLabId, projectId, id } = await params;

  queryClient.prefetchQuery({
    queryKey: keyBuilder.meModel({ virtualLabId, projectId, entityId: id }),
    queryFn: () => getMEModel({ id, context: { virtualLabId, projectId } }),
  });

  return (
    <WorkflowSimulateLayout>
      <HydrateClient>{children}</HydrateClient>
    </WorkflowSimulateLayout>
  );
}
