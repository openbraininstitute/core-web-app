'use client';

import dynamic from 'next/dynamic';

import useBuildSingleNeuronSynaptomeSessionState from '@/features/entities/single-neuron-synaptome/build/create.state-session';
import DefaultLoadingSuspense from '@/components/DefaultLoadingSuspense';

import type { WorkspaceContext } from '@/types/common';

const NeuronViewerContainer = dynamic(
  () => import('@/components/neuron-viewer/NeuronViewerWithActions'),
  {
    ssr: false,
  }
);

const SynaptomeConfigurationForm = dynamic(
  () => import('@/features/entities/single-neuron-synaptome/build/elements/synapse-config-form'),
  {
    ssr: false,
  }
);

type Props = WorkspaceContext & {
  stateId: string;
};

function SynaptomeConfiguration({ virtualLabId, projectId, stateId }: Props) {
  const { sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    virtualLabId,
    projectId,
    stateId,
  });

  return (
    <div className="grid h-[calc(100vh-51px)] w-full grid-cols-2">
      <div className="flex items-center justify-center bg-black">
        <DefaultLoadingSuspense>
          <NeuronViewerContainer
            useCursor
            useEvents
            useZoomer
            useActions
            virtualLabId={virtualLabId}
            projectId={projectId}
            meModelId={sessionValue?.selectedRows?.at(0)?.id!}
            zoomPlacement="right"
          />
        </DefaultLoadingSuspense>
      </div>
      <div className="secondary-scrollbar h-[calc(100%-100px)] w-full p-8">
        <SynaptomeConfigurationForm
          {...{
            entity: sessionValue?.selectedRows?.at(0)!,
            virtualLabId,
            projectId,
            stateId,
          }}
        />
      </div>
    </div>
  );
}

export default SynaptomeConfiguration;
