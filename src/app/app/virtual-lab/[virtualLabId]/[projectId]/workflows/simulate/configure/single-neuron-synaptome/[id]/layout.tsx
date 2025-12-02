import { Suspense, type ReactNode } from 'react';

import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { WorkflowSimulateLayout } from '@/ui/layouts/workflow-simulate-layout';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ServerSideLayoutProp, WorkspaceContext } from '@/types/common';

export default async function Layout({
  params,
  children,
}: ServerSideLayoutProp<WorkspaceContext & { id: string }> & { children: ReactNode }) {
  const queryClient = getQueryClient();
  const { virtualLabId, projectId, id } = await params;

  queryClient.prefetchQuery({
    queryKey: keyBuilder.synaptome({ virtualLabId, projectId, entityId: id }),
    queryFn: () => getSingleNeuronSynaptome({ id, context: { virtualLabId, projectId } }),
  });

  return (
    <WorkflowSimulateLayout>
      <HydrateClient>
        <Suspense>{children}</Suspense>
      </HydrateClient>
    </WorkflowSimulateLayout>
  );
}
