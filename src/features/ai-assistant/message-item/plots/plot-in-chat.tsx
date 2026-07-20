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

/**
 * Preloads an image URL using an off-screen Image object.
 * Returns true once the image is in the browser's cache.
 */
function useImagePreload(url: string | undefined): boolean {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!url) {
      setLoaded(false);
      return;
    }

    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(true); // treat error as "done" — let renderer handle it
    img.src = url;

    // If already cached, onload fires synchronously in some browsers
    if (img.complete) {
      setLoaded(true);
    }

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return loaded;
}

export default function PlotInChat({
  storageId,
  isBackup,
  isStreaming,
}: {
  storageId: string;
  isBackup?: boolean;
  isStreaming?: boolean;
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

  // Freeze the streaming decision at mount time. If this component was created during
  // streaming, we want to animate even if streaming ends before data arrives.
  const wasStreamingAtMountRef = React.useRef(!!isStreaming);

  // Track whether we ever showed the skeleton. If we did, the reveal animation
  // already ran at the skeleton level — the renderer should NOT re-animate.
  const didShowSkeletonRef = React.useRef(false);
  if (isLoading) {
    didShowSkeletonRef.current = true;
  }

  // For images: preload the actual image so we can keep showing the skeleton
  // until the image is fully cached. This eliminates the grey flash between
  // "skeleton unmounts" and "image loads in renderer".
  const isImageType = data?.type === 'image';
  const imageUrl = isImageType && isString(data?.content) ? data.content : undefined;
  const imagePreloaded = useImagePreload(imageUrl);

  if (isError) {
    return <PlotErrorMessage isBackup={isBackup} />;
  }

  const isReady = !isLoading && !!data;
  const { content, type } = data ?? {};

  if (isReady && !isString(content)) return null;

  // Use the mount-time streaming state for the skeleton reveal.
  const skeletonIsStreaming = wasStreamingAtMountRef.current;

  // For images: keep showing skeleton until the image is actually preloaded.
  // For plots (JSON): data is in memory, so switch immediately.
  const showSkeleton = !isReady || (isImageType && !imagePreloaded);

  if (showSkeleton) return <ToolSkeletonStandalone isStreaming={skeletonIsStreaming} />;

  // If skeleton already handled the height reveal, don't pass isStreaming to renderers
  // (prevents double grow-in animation).
  const rendererIsStreaming = didShowSkeletonRef.current ? false : skeletonIsStreaming;

  if (type === 'image') {
    return (
      <PlotErrorBoundary isBackup={isBackup}>
        <ToolThumbnailGeneration
          result={{ storage_id: storageId }}
          data={data!}
          isStreaming={rendererIsStreaming}
          skipSkeleton={didShowSkeletonRef.current}
        />
      </PlotErrorBoundary>
    );
  }

  return (
    <PlotErrorBoundary isBackup={isBackup}>
      <ToolPlotGenerator
        result={{ storage_id: storageId }}
        data={data!}
        plotRenderKey={plotRenderKey}
        isAnimating={isAnimating}
        isStreaming={rendererIsStreaming}
      />
    </PlotErrorBoundary>
  );
}
