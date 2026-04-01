'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { use } from 'react';

import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { ResponsiveSideViewer } from '@/components/responsive-side-viewer';
import {
  type ThreeDVisualizerQueryParamKeys,
  threeDVisualizerState,
  type WorkflowSimulatePanelKeys,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { Header } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/header';
import { MenuSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu-selector';
import { PanelSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/panel-selector';
import { NeuronVisualizer } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/neuron-visualizer';
import { SimulationType } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
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
    '3d': ThreeDVisualizerQueryParamKeys;
  }
>) {
  const queryParams = use(searchParams);
  const { virtualLabId, projectId, id: modelId } = use(pathParams);
  let sessionId = queryParams?.sessionId;
  if (!sessionId) sessionId = crypto.randomUUID();
  const { data: entity } = useSuspenseQuery({
    queryKey: keyBuilder.synaptome({ virtualLabId, projectId, entityId: modelId }),
    queryFn: () => getSingleNeuronSynaptome({ id: modelId, context: { virtualLabId, projectId } }),
  });

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
          <MenuSelector
            sessionId={sessionId}
            type={SimulationType.SingleNeuronSynaptome}
            synaptome={entity}
            memodel={entity.me_model}
          />
        </div>
        <div
          id="synaptome-simulation-panel"
          data-testid="synaptome-simulation-panel"
          className="flex h-full max-h-full min-h-0 w-full flex-col [grid-area:content]"
        >
          <ResponsiveSideViewer>
            <HydrateWrapper>
              <PanelSelector
                sessionId={sessionId}
                memodel={entity.me_model}
                synaptome={entity}
                type={SimulationType.SingleNeuronSynaptome}
              />
            </HydrateWrapper>
            <NeuronVisualizer
              sessionId={sessionId}
              memodelId={entity.me_model.id}
              disableSynapses={false}
            />
          </ResponsiveSideViewer>
          {/* <div
            id="simulation-panel-wrapper"
            data-testid="simulation-panel-wrapper"
            className={cn(
              'grid h-full min-h-0 gap-4 overflow-hidden overflow-y-auto',
              { 'grid-cols-[2fr_3fr]': visualizerState === threeDVisualizerState.Expanded },
              { 'grid-cols-[2.5fr_5rem]': visualizerState === threeDVisualizerState.Collapsed }
            )}
          >
          </div> */}
        </div>
      </div>
    </>
  );
}
