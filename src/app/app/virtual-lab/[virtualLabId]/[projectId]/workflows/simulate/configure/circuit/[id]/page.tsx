'use client';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { use } from 'react';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import SimulationConfig from '@/features/small-microcircuit';
import { keyBuilder } from '@/ui/use-query-keys/data';

import { CircuitOrigin } from '@/services/small-scale-simulator/types';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { WorkflowSimulatePanelKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import type { ExperimentStepKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu';

export default function Page({
  searchParams,
  params: pathParams,
}: ServerSideComponentProp<
  WorkspaceContext & { id: string },
  {
    step: ExperimentStepKeys;
    sessionId: string;
    panel: WorkflowSimulatePanelKeys;
    initialCampaignId: string;
  }
>) {
  const queryParams = use(searchParams);
  const { initialCampaignId } = queryParams;
  const { virtualLabId, projectId, id: modelId } = use(pathParams);

  let sessionId = queryParams?.sessionId;
  if (!sessionId) sessionId = crypto.randomUUID();

  const { data: entity } = useSuspenseQuery({
    queryKey: [modelId],
    queryFn: () =>
      modelId ? getCircuit({ id: modelId, context: { virtualLabId, projectId } }) : null,
  });

  const {
    data: campaignData,
    error,
    isLoading,
  } = useQuery({
    queryKey: keyBuilder.simCampaign({ entityId: initialCampaignId }),
    queryFn: async () => {
      if (!initialCampaignId) return null;
      return await resolveSimulationByCampaignId({
        id: initialCampaignId,
        context: { virtualLabId, projectId },
      });
    },
  });

  if (error || !entity) {
    return notFound();
  }

  if (
    !initialCampaignId ||
    (initialCampaignId && !isLoading && campaignData && campaignData.config.form)
  ) {
    return (
      <div className="border-neutral-2 ml-2 h-full rounded-2xl border pt-3">
        <SimulationConfig
          modelId={entity.id}
          circuitOrigin={CircuitOrigin.CIRCUIT}
          virtualLabId={virtualLabId}
          projectId={projectId}
          initialConfig={campaignData?.config.form}
          className="px-10 pt-2"
        />
      </div>
    );
  }
}
