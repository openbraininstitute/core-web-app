import PlotErrorMessage from '@/components/github-flavor-markdown/plot-error-message';
import { isString } from '@/util/type-guards';

import { usePlotFile } from './hooks';
import ToolThumbnailGeneration from './renderers/image-renderer/tool-thumbnail-generation-morphology-getone';
import ToolPlotGenerator from './renderers/plot-renderer/tool-plot-generator';
import ToolSkeleton from './renderers/skeleton/tool-skeleton';

export default function PlotInChat({
  storageId,
  isBackup,
}: {
  storageId: string;
  isBackup?: boolean;
}) {
  const { data, isError, isLoading } = usePlotFile(storageId);

  if (isError) {
    return <PlotErrorMessage isBackup={isBackup} />;
  }

  if (isLoading || !data) return <ToolSkeleton />;

  const { content, type } = data;
  if (!isString(content)) return null;

  if (type === 'image') {
    return <ToolThumbnailGeneration result={{ storage_id: storageId }} data={data} />;
  }

  return <ToolPlotGenerator result={{ storage_id: storageId }} data={data} />;
}
