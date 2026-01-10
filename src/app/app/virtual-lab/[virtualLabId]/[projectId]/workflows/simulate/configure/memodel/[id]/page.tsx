'use client';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { use } from 'react';

import { getMEModel } from '@/api/entitycore/queries';
import {
  ExtendedEntitiesTypeDict,
  TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import SimulationConfig from '@/features/small-microcircuit';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import {
  threeDVisualizerState,
  type ThreeDVisualizerQueryParamKeys,
  type WorkflowSimulatePanelKeys,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { Header } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/header';
import type { ExperimentStepKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu';
import { MenuSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu-selector';
import { PanelSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/panel-selector';
import { NeuronVisualizer } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/neuron-visualizer';
import { SimulationType } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

export default function Page({
  searchParams,
  params: pathParams,
}: ServerSideComponentProp<
  WorkspaceContext & { id: string },
  {
    step: ExperimentStepKeys;
    sessionId: string;
    panel: WorkflowSimulatePanelKeys;
    dataType: TExtendedEntitiesTypeDict;
    '3d': ThreeDVisualizerQueryParamKeys;
    initialCampaignId: string;
  }
>) {
  const queryParams = use(searchParams);
  const { initialCampaignId } = queryParams;
  const { virtualLabId, projectId, id: modelId } = use(pathParams);

  const visualizerState =
    (queryParams['3d'] as ThreeDVisualizerQueryParamKeys) ?? threeDVisualizerState.Expanded;

  let sessionId = queryParams?.sessionId;
  if (!sessionId) sessionId = crypto.randomUUID();

  const { data: entity } = useSuspenseQuery({
    queryKey: keyBuilder.meModel({ virtualLabId, projectId, entityId: modelId }),
    queryFn: () => getMEModel({ id: modelId, context: { virtualLabId, projectId } }),
  });

  const { data: campaignData } = useQuery({
    queryKey: keyBuilder.simCampaign({ entityId: initialCampaignId }),
    queryFn: async () => {
      if (!initialCampaignId) return null;
      return await resolveSimulationByCampaignId({
        id: initialCampaignId,
        context: { virtualLabId, projectId },
      });
    },
  });

  if (queryParams.dataType === ExtendedEntitiesTypeDict.MemodelCircuit) {
    return (
      <SimulationConfig
        modelId={entity.id}
        virtualLabId={virtualLabId}
        projectId={projectId}
        initialConfig={campaignData?.config.form}
        className="px-8 pt-1"
      />
    );
  }

  return (
    <>
      <div className="mb-2 w-full shrink-0">
        <Header />
      </div>
      <div className='mt-5 grid h-full max-h-[calc(100%-4rem)] min-h-0 w-full flex-1 grid-cols-[24rem_1fr] gap-4 [grid-template-areas:"menu_content"]'>
        <div
          id="menu"
          className="flex h-full w-full flex-col gap-2 overflow-hidden [grid-area:menu]"
        >
          <MenuSelector sessionId={sessionId} type={SimulationType.SingleNeuron} memodel={entity} />
        </div>
        <div
          id="memodel-simulation-panel"
          data-testid="memodel-simulation-panel"
          className="flex h-full max-h-full min-h-0 w-full flex-col [grid-area:content]"
        >
          <div
            id="simulation-panel-wrapper"
            data-testid="simulation-panel-wrapper"
            className={cn(
              'grid h-full min-h-0 gap-4 overflow-hidden overflow-y-auto',
              { 'grid-cols-[2fr_3fr]': visualizerState === threeDVisualizerState.Expanded },
              { 'grid-cols-[2.5fr_5rem]': visualizerState === threeDVisualizerState.Collapsed }
            )}
          >
            <HydrateWrapper>
              <PanelSelector
                sessionId={sessionId}
                type={SimulationType.SingleNeuron}
                memodel={entity}
              />
            </HydrateWrapper>
            <NeuronVisualizer sessionId={sessionId} memodelId={entity.id} disableSynapses />
          </div>
        </div>
      </div>
    </>
  );
}
