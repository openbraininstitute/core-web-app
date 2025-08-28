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
      className="hidden h-full max-h-full flex-1 xl:flex"
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
