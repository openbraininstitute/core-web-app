'use client';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { use } from 'react';

import { getMEModel } from '@/api/entitycore/queries';
import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { ResponsiveSideViewer } from '@/components/responsive-side-viewer';
import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import { ScanConfiguration } from '@/features/scan-config';
import { WorkflowSimulateLayout } from '@/ui/layouts/workflow-simulate-layout';
import { Header } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/header';
import { MenuSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu-selector';
import { PanelSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/panel-selector';
import { NeuronVisualizer } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/neuron-visualizer';
import { SimulationType } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type {
  ThreeDVisualizerQueryParamKeys,
  WorkflowSimulatePanelKeys,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
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
    dataType: TExtendedEntitiesTypeDict;
    '3d': ThreeDVisualizerQueryParamKeys;
    initialCampaignId: string;
  }
>) {
  const queryParams = use(searchParams);
  const { initialCampaignId } = queryParams;
  const { virtualLabId, projectId, id: modelId } = use(pathParams);
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
      <div className="border-neutral-2 ml-2 h-full rounded-2xl border">
        <ScanConfiguration
          entityId={entity.id}
          entityType={ExtendedEntitiesTypeDict.MemodelCircuit}
          virtualLabId={virtualLabId}
          projectId={projectId}
          initialConfig={campaignData?.config.form}
          className="px-4"
        />
      </div>
    );
  }

  return (
    <WorkflowSimulateLayout>
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
          <ResponsiveSideViewer>
            <HydrateWrapper>
              <PanelSelector
                sessionId={sessionId}
                type={SimulationType.SingleNeuron}
                memodel={entity}
              />
            </HydrateWrapper>
            <NeuronVisualizer sessionId={sessionId} memodelId={entity.id} disableSynapses />
          </ResponsiveSideViewer>
        </div>
      </div>
    </WorkflowSimulateLayout>
  );
}
