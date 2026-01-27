import { NeuronViewerContainer } from '@/components/neuron-viewer/neuron-viewer-with-actions';
import { useBuildSingleNeuronSynaptomeSessionState } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { SynapseSet } from '@/ui/segments/workflows/build/single-neuron-synaptome/synapse-set-item';

type Props = {
  sessionId: string;
};

export function SynapseSetConfiguration({ sessionId }: Props) {
  const { sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });

  return (
    <div className="grid h-full w-full grid-cols-2 flex-col items-start gap-4">
      <SynapseSet sessionId={sessionId} />
      <div className="relative h-full max-h-full flex-1">
        {sessionValue?.memodel?.id && (
          <NeuronViewerContainer
            disableElectrodes
            disableSynapses={false}
            meModelId={sessionValue?.memodel?.id}
            sessionId={sessionId}
          />
        )}
      </div>
    </div>
  );
}
