'use client';

import { Spinner } from '@bprogress/next';

import { ResponsiveSideViewer } from '@/components/responsive-side-viewer';
import {
  type TLegacyWorkflowSessionSearchParams,
  useLegacyWorkflowSessionFromSearchParams,
} from '@/features/scan-config/workflow/legacy-session';
import { WorkflowSimulateLayout } from '@/ui/layouts/workflow-simulate-layout';
import { Header } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/header';
import { MenuSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu-selector';
import { PanelSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/panel-selector';
import { NeuronVisualizer } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/neuron-visualizer';
import { SimulationType } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import { useEntity } from './hooks';

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
  TLegacyWorkflowSessionSearchParams & {
    step: ExperimentStepKeys;
    panel: WorkflowSimulatePanelKeys;
    '3d': ThreeDVisualizerQueryParamKeys;
  }
>) {
  const sessionId = useLegacyWorkflowSessionFromSearchParams(searchParams);
  const entity = useEntity(pathParams);
  if (!entity) return <Spinner />;

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
