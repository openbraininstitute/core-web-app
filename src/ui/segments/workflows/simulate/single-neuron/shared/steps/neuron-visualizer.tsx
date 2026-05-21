'use client';

import { NeuronViewerContainer } from '@/components/neuron-viewer/neuron-viewer-with-actions';

type Props = {
  sessionId: string;
  memodelId: string;
  disableElectrodes?: boolean;
  disableSynapses?: boolean;
};

export function NeuronVisualizer({
  sessionId,
  memodelId,
  disableElectrodes,
  disableSynapses,
}: Props) {
  return (
    memodelId && (
      <NeuronViewerContainer
        disableElectrodes={disableElectrodes}
        disableSynapses={disableSynapses}
        meModelId={memodelId}
        sessionId={sessionId}
      />
    )
  );
}
