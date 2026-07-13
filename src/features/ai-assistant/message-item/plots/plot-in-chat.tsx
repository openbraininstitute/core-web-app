import React from 'react';

import { useIsDragging, usePanelWidth } from '@/features/ai-assistant/hooks';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { isString } from '@/util/type-guards';

import { usePlotFile } from './hooks';
import PlotErrorMessage from './plot-error-message';
import ToolThumbnailGeneration from './renderers/image-renderer/tool-thumbnail-generation-morphology-getone';
import ToolPlotGenerator from './renderers/plot-renderer/tool-plot-generator';
import { ToolSkeletonStandalone } from './renderers/skeleton/tool-skeleton';

const ANIMATION_DURATION = 500;

class PlotErrorBoundary extends React.Component<
  { children: React.ReactNode; isBackup?: boolean },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; isBackup?: boolean }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <PlotErrorMessage isBackup={this.props.isBackup} />;
    }
    return this.props.children;
  }
}

export default function PlotInChat({
  storageId,
  isBackup,
}: {
  storageId: string;
  isBackup?: boolean;
}) {
  const { panelWidth } = usePanelWidth();
  const isDragging = useIsDragging();
  const { isFullscreen } = usePanelState();
  const plotRenderKeyRef = React.useRef(panelWidth);
  const [deferredFullscreen, setDeferredFullscreen] = React.useState(isFullscreen);
  const isAnimating = isFullscreen !== deferredFullscreen;

  // Defer the fullscreen key change until after the panel animation completes.
  // During the animation the plot stays frozen (old key, resize disabled),
  // then remounts once at the final size.
  React.useEffect(() => {
    const timer = setTimeout(() => setDeferredFullscreen(isFullscreen), ANIMATION_DURATION);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  if (!isDragging && !isAnimating) plotRenderKeyRef.current = panelWidth;
  const plotRenderKey = deferredFullscreen ? 'fullscreen' : plotRenderKeyRef.current;

  const { data, isError, isLoading } = usePlotFile(storageId);

  if (isError) {
    return <PlotErrorMessage isBackup={isBackup} />;
  }

  if (isLoading || !data) return <ToolSkeletonStandalone />;

  const { content, type } = data;
  if (!isString(content)) return null;

  if (type === 'image') {
    return (
      <PlotErrorBoundary isBackup={isBackup}>
        <ToolThumbnailGeneration result={{ storage_id: storageId }} data={data} />
      </PlotErrorBoundary>
    );
  }

  return (
    <PlotErrorBoundary isBackup={isBackup}>
      <ToolPlotGenerator
        result={{ storage_id: storageId }}
        data={data}
        plotRenderKey={plotRenderKey}
        isAnimating={isAnimating}
      />
    </PlotErrorBoundary>
  );
}
