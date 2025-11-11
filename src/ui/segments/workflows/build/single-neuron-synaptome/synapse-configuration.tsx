import { SynapseSet } from '@/ui/segments/workflows/build/single-neuron-synaptome/synapse-set-item';
import { useBuildSingleNeuronSynaptomeSessionState } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { NeuronViewerContainer } from '@/components/neuron-viewer/neuron-viewer-with-actions';
import { useWorkspace } from '@/ui/hooks/use-workspace';

type Props = {
  sessionId: string;
};

export function SynapseSetConfiguration({ sessionId }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const { sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });

  return (
    <div className="grid h-full w-full grid-cols-2 flex-col items-start gap-4">
      <SynapseSet sessionId={sessionId} />
      <div className="relative h-full max-h-full flex-1">
        {sessionValue?.memodel?.id && (
          <NeuronViewerContainer
            useCursor
            useEvents
            useZoomer
            disableElectrodes
            virtualLabId={virtualLabId}
            projectId={projectId}
            meModelId={sessionValue?.memodel?.id}
            zoomPlacement="right"
            mode="build"
            sessionId={sessionId}
          />
        )}
      </div>
    </div>
  );
}
