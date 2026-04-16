import { NeuronViewerContainer } from '@/components/neuron-viewer/neuron-viewer-with-actions';
import { ResponsiveSideViewer } from '@/components/responsive-side-viewer';
import { useBuildSingleNeuronSynaptomeSessionState } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { SynapseSet } from '@/ui/segments/workflows/build/single-neuron-synaptome/synapse-set-item/synapse-set-item';

type Props = {
  sessionId: string;
};

export function SynapseSetConfiguration({ sessionId }: Props) {
  const { sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });

  return (
    <ResponsiveSideViewer>
      <SynapseSet sessionId={sessionId} />
      {sessionValue?.memodel?.id && (
        <NeuronViewerContainer
          disableElectrodes
          disableSynapses={false}
          meModelId={sessionValue?.memodel?.id}
          sessionId={sessionId}
        />
      )}
    </ResponsiveSideViewer>
  );
}
