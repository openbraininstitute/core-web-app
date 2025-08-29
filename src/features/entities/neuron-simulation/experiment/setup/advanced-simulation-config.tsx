'use client';

import { useParams } from 'next/navigation';

import Wrapper from '@/features/entities/neuron-simulation/experiment/elements/wrapper';
import ParameterView from '@/features/entities/neuron-simulation/experiment/steps-wizard';
import { NeuronViewerContainer } from '@/components/neuron-viewer/neuron-viewer-with-actions';

import type { SingleNeuronSynaptomePayload } from '@/features/entities/neuron-simulation/experiment/containers/synaptome';
import type { WorkspaceContext } from '@/types/common';

type BaseProps = {
  meModelId: string;
};

type SynaptomeProps = BaseProps & {
  type: 'synaptome-simulation';
  payload: SingleNeuronSynaptomePayload;
};

type SingleNeuronProps = BaseProps & {
  type: 'single-neuron-simulation';
  payload?: never;
};

type Props = SynaptomeProps | SingleNeuronProps;

export default function SimulationConfiguration({ meModelId, type, payload }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext & { id: string }>();
  return (
    <Wrapper
      viewer={
        <NeuronViewerContainer
          useActions
          useCursor
          useEvents
          useZoomer
          useLabels
          meModelId={meModelId}
          zoomPlacement="right"
          projectId={projectId}
          virtualLabId={virtualLabId}
        />
      }
      type={type}
    >
      {type === 'synaptome-simulation' ? (
        <ParameterView
          meModelId={meModelId}
          type={type}
          projectId={projectId}
          virtualLabId={virtualLabId}
          payload={payload}
        />
      ) : (
        <ParameterView
          meModelId={meModelId}
          type={type}
          projectId={projectId}
          virtualLabId={virtualLabId}
        />
      )}
    </Wrapper>
  );
}
