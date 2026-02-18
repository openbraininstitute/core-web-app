import PlotErrorMessage from '@/components/github-flavor-markdown/plot-error-message';
import { isString } from '@/util/type-guards';

import { usePlotFile } from './hooks';
import ToolPlotGenerator from './tool-plot-generator/tool-plot-generator';
import ToolSkeleton from './tool-skeleton';
import ToolThumbnailGeneration from './tool-thumbnail-generation-morphology-getone/tool-thumbnail-generation-morphology-getone';

export default function PlotInChat({ storageId }: { storageId: string }) {
  const { data, isError, isLoading } = usePlotFile(storageId);

  if (isError) {
    return <PlotErrorMessage />;
  }

  if (isLoading || !data) return <ToolSkeleton />;

  const { content, type } = data;
  if (!isString(content)) return null;

  if (type === 'image') {
    return <ToolThumbnailGeneration result={{ storage_id: storageId }} data={data} />;
  }

  return <ToolPlotGenerator result={{ storage_id: storageId }} data={data} />;
}
