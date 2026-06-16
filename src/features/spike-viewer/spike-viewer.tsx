import { Empty, Spin } from 'antd';
import { ErrorBoundary } from 'react-error-boundary';

import RasterPlot from '@/features/spike-viewer/components/raster-plot';
import useSpikeTrace from '@/features/spike-viewer/hooks/use-spike-trace';
import SimpleErrorComponent from '@/ui/molecules/error-fallback';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

type SpikeViewerProps = {
  entityId: string;
  entityType: TEntityTypeDict;
  asset: IAsset;
  ctx?: WorkspaceContext;
};

export default function SpikeViewer({ entityId, entityType, asset, ctx }: SpikeViewerProps) {
  const [data, error] = useSpikeTrace({ entityId, entityType, asset, ctx });

  if (error) {
    return <Empty className="p-2em" description="There was a problem loading the spike data" />;
  }

  if (!data) {
    return <Spin />;
  }

  return (
    <div className="flex h-full flex-col">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent} resetKeys={[data]}>
        <RasterPlot data={data} />
      </ErrorBoundary>
    </div>
  );
}
