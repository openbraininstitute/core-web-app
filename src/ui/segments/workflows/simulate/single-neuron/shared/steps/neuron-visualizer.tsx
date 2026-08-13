'use client';

import { NeuronViewerContainer } from '@/components/neuron-viewer/neuron-viewer-with-actions';

type Props = {
  sessionId: string;
  memodelId: string;
  disableElectrodes?: boolean;
  disableSynapses?: boolean;
  /** Fill the parent pane and hide the collapse strip. Used by scan-config. */
  fillContainer?: boolean;
};

export function NeuronVisualizer({
  sessionId,
  memodelId,
  disableElectrodes,
  disableSynapses,
  fillContainer,
}: Props) {
  return (
    memodelId && (
      <div className={fillContainer ? 'h-full w-full min-h-0' : undefined}>
        <NeuronViewerContainer
          disableElectrodes={disableElectrodes}
          disableSynapses={disableSynapses}
          meModelId={memodelId}
          sessionId={sessionId}
          fillContainer={fillContainer}
        />
      </div>
    )
  );
}
