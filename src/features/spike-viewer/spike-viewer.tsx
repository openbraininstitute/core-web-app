import { Empty, Spin } from 'antd';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import RasterPlot from '@/features/spike-viewer/components/raster-plot';
import useSpikeTrace from '@/features/spike-viewer/hooks/use-spike-trace';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

type SpikeViewerProps = {
  entityId: string;
  entityType: string;
  asset: IAsset;
  ctx?: WorkspaceContext;
};

export default function SpikeViewer({ entityId, entityType, asset, ctx }: SpikeViewerProps) {
  const [trace, error] = useSpikeTrace({ entityId, entityType, asset, ctx });

  if (error) {
    return <Empty className="p-2em" description="There was a problem loading the spike data" />;
  }

  if (!trace || !trace.data) {
    return <Spin />;
  }

  return (
    <div className="flex h-full flex-col">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent} resetKeys={[trace]}>
        <RasterPlot data={trace.data} />
      </ErrorBoundary>
    </div>
  );
}
