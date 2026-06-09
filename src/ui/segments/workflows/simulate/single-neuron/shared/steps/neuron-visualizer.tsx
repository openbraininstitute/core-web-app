'use client';

import { NeuronViewerContainer } from '@/components/neuron-viewer/neuron-viewer-with-actions';

type Props = {
  sessionId: string;
  memodelId: string;
  disableElectrodes?: boolean;
  disableSynapses?: boolean;
  positionAbsolute?: boolean;
  onCollapsed?(value: boolean): void;
};

export function NeuronVisualizer({
  sessionId,
  memodelId,
  disableElectrodes,
  disableSynapses,
  positionAbsolute,
  onCollapsed,
}: Props) {
  return (
    memodelId && (
      <NeuronViewerContainer
        positionAbsolute={positionAbsolute}
        disableElectrodes={disableElectrodes}
        disableSynapses={disableSynapses}
        meModelId={memodelId}
        sessionId={sessionId}
        onCollapsed={onCollapsed}
      />
    )
  );
}
