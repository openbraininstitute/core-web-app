'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { use } from 'react';
import SimulationConfig from '@/features/small-microcircuit';

import type { WorkflowSimulatePanelKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import type { ExperimentStepKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';

export default function Page({
  searchParams,
  params: pathParams,
}: ServerSideComponentProp<
  WorkspaceContext & { id: string },
  {
    step: ExperimentStepKeys;
    sessionId: string;
    panel: WorkflowSimulatePanelKeys;
  }
>) {
  const queryParams = use(searchParams);
  const { virtualLabId, projectId, id: modelId } = use(pathParams);

  let sessionId = queryParams?.sessionId;
  if (!sessionId) sessionId = crypto.randomUUID();

  const { data: entity } = useSuspenseQuery({
    queryKey: [modelId],
    queryFn: () => getCircuit({ id: modelId, context: { virtualLabId, projectId } }),
  });

  return (
    <SimulationConfig circuitId={entity.id} virtualLabId={virtualLabId} projectId={projectId} />
  );
}
