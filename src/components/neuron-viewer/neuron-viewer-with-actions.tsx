'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { useState } from 'react';

import { CursorPopover, InjectionRecordingPopover } from '@/components/neuron-viewer/plugins';
import { CustomZoomer } from '@/components/neuron-viewer/plugins/custom-zoomer';
import { DefaultLoadingSuspense } from '@/components/DefaultLoadingSuspense';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { NeuronViewer } from '@/components/neuron-viewer';

import type {
  TNeuronViewerClickData,
  TNeuronViewerHoverData,
} from '@/services/bluenaas-single-cell/renderer';
import { WebglNeuronSelector } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/webgl-neuron-selector/webgl-neuron-selector';

type Props = {
  meModelId: string;
  zoomPlacement?: 'left' | 'right';
  useZoomer?: boolean;
  useCursor?: boolean;
  useEvents?: boolean;
  useActions?: boolean;
  useLabels?: boolean;
  virtualLabId: string;
  projectId: string;
  sessionId: string;
};
export function NeuronViewerContainer({
  meModelId,
  zoomPlacement = 'right',
  useZoomer = false,
  useCursor = false,
  useEvents = false,
  useActions = false,
  useLabels = false,
  virtualLabId,
  projectId,
  sessionId,
}: Props) {
  const [disableHovering, setDisableHovering] = useState(() => !useActions);
  const [neuronViewerClickData, setNeuronViewerOnClickData] =
    useState<TNeuronViewerClickData | null>(null);
  const [neuronViewerHoverData, setNeuronViewerOnHoverData] =
    useState<TNeuronViewerHoverData | null>(null);

  return (
    <ErrorBoundary
      FallbackComponent={withErrorConfig({
        showButtons: false,
        cls: {
          container: 'rounded-xl bg-transparent border border-neutral-2',
          error: '[&_h2]:text-primary-8 bg-transparent px-0',
        },
      })}
    >
      <DefaultLoadingSuspense>
        <NeuronViewer
          projectId={projectId}
          virtualLabId={virtualLabId}
          meModelId={meModelId}
          sessionId={sessionId}
          actions={{
            onClick: (data) => {
              setNeuronViewerOnClickData(data);
              setDisableHovering(true);
            },
            onHover: setNeuronViewerOnHoverData,
            onHoverEnd: () => setNeuronViewerOnHoverData(null),
          }}
          {...{
            useZoomer,
            useCursor,
            useEvents,
            useActions,
            useLabels,
          }}
        >
          {({
            renderer,
            useActions: enableActions,
            useCursor: enableCursor,
            useZoomer: enableZoom,
          }) => {
            return (
              <>
                {enableActions && neuronViewerClickData && (
                  <InjectionRecordingPopover
                    sessionId={sessionId}
                    show={!!neuronViewerClickData}
                    data={{
                      x: neuronViewerClickData.position.x,
                      y: neuronViewerClickData.position.y,
                      section: neuronViewerClickData.data.section,
                      offset: neuronViewerClickData.data.offset,
                    }}
                    onClose={() => {
                      setNeuronViewerOnClickData(null);
                      setDisableHovering(false);
                    }}
                  />
                )}
                {enableCursor && neuronViewerHoverData && !disableHovering && (
                  <CursorPopover
                    show={!!neuronViewerHoverData}
                    x={neuronViewerHoverData.position.x}
                    y={neuronViewerHoverData.position.y}
                    data={neuronViewerHoverData.data}
                  />
                )}
                {enableZoom && <CustomZoomer renderer={renderer} placement={zoomPlacement} />}
              </>
            );
          }}
        </NeuronViewer>
        <WebglNeuronSelector
          projectId={projectId}
          virtualLabId={virtualLabId}
          meModelId={meModelId}
        />
      </DefaultLoadingSuspense>
    </ErrorBoundary>
  );
}

export default NeuronViewerContainer;
