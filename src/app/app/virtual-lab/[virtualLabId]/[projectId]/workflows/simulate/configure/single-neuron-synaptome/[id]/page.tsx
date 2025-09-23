'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { use } from 'react';

import { NeuronVisualizer } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/neuron-visualizer';
import { PanelSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/panel-selector';
import { MenuSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu-selector';
import { ExperimentStepKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu';
import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { Header } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/header';
import { SimulationType } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { WorkflowSimulatePanelKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

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
    queryKey: keyBuilder.synaptome({ virtualLabId, projectId, entityId: modelId }),
    queryFn: () => getSingleNeuronSynaptome({ id: modelId, context: { virtualLabId, projectId } }),
  });

  return (
    <>
      <div className="mb-2 w-full flex-shrink-0">
        <Header sessionId={sessionId} />
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
          <div
            id="simulation-panel-wrapper-two-side"
            data-testid="simulation-panel-wrapper-two-side"
            className={cn(
              'grid h-full min-h-0 gap-4 overflow-hidden overflow-y-auto xl:grid-cols-[2.5fr_2fr]'
            )}
          >
            <HydrateWrapper>
              <PanelSelector
                sessionId={sessionId}
                memodel={entity.me_model}
                synaptome={entity}
                type={SimulationType.SingleNeuronSynaptome}
              />
            </HydrateWrapper>
            <NeuronVisualizer sessionId={sessionId} memodelId={entity.me_model.id} />
          </div>
        </div>
      </div>
    </>
  );
}
