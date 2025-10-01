'use client';

import { NeuronViewerContainer } from '@/components/neuron-viewer/neuron-viewer-with-actions';
import { useWorkspace } from '@/ui/hooks/use-workspace';

type Props = {
  sessionId: string;
  memodelId: string;
};

export function NeuronVisualizer({ sessionId, memodelId }: Props) {
  const { virtualLabId, projectId } = useWorkspace();

  return (
    <div
      id="neuron-visualizer"
      data-testid="neuron-visualizer"
      className="h-full max-h-full min-w-0 flex-1"
    >
      {memodelId && (
        <NeuronViewerContainer
          useCursor
          useEvents
          useZoomer
          useActions
          useLabels
          virtualLabId={virtualLabId}
          projectId={projectId}
          meModelId={memodelId}
          sessionId={sessionId}
          zoomPlacement="right"
        />
      )}
    </div>
  );
}
