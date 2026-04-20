import React from 'react';

import { useIsDragging, usePanelWidth } from '@/components/ai-assistant/hooks';
import PlotErrorMessage from '@/components/github-flavor-markdown/plot-error-message';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { isString } from '@/util/type-guards';

import { usePlotFile } from './hooks';
import ToolThumbnailGeneration from './renderers/image-renderer/tool-thumbnail-generation-morphology-getone';
import ToolPlotGenerator from './renderers/plot-renderer/tool-plot-generator';
import { ToolSkeletonStandalone } from './renderers/skeleton/tool-skeleton';

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
  if (!isDragging) plotRenderKeyRef.current = panelWidth;
  const plotRenderKey = isFullscreen ? 'fullscreen' : plotRenderKeyRef.current;

  const { data, isError, isLoading } = usePlotFile(storageId);

  if (isError) {
    return <PlotErrorMessage isBackup={isBackup} />;
  }

  if (isLoading || !data) return <ToolSkeletonStandalone />;

  const { content, type } = data;
  if (!isString(content)) return null;

  if (type === 'image') {
    return <ToolThumbnailGeneration result={{ storage_id: storageId }} data={data} />;
  }

  return (
    <ToolPlotGenerator
      result={{ storage_id: storageId }}
      data={data}
      isSmall={plotRenderKeyRef.current < 420}
      plotRenderKey={plotRenderKey}
    />
  );
}
