import { Empty, Spin } from 'antd';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import RasterPlot from '@/features/spike-viewer/components/raster-plot';
import useSpikeTrace from '@/features/spike-viewer/hooks/use-spike-trace';
import { useSimulationModel } from '@/features/spike-viewer/simulation-model-context';
import { replayableCircuit } from '@/features/spike-viewer/spike-replay/replayable-circuit';
import { SpikeReplayView } from '@/features/spike-viewer/spike-replay/spike-replay-view';

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
  // Only a circuit simulation has somewhere to replay spikes; an ion-channel or
  // single-cell campaign gets the raster it has always had, with no toggle
  // offering a view that cannot be drawn.
  const circuit = replayableCircuit(useSimulationModel());

  if (error) {
    return <Empty className="p-2em" description="There was a problem loading the spike data" />;
  }

  if (!data) {
    return <Spin />;
  }

  return (
    <div className="flex h-full flex-col">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent} resetKeys={[data]}>
        {circuit ? <SpikeReplayView data={data} circuit={circuit} /> : <RasterPlot data={data} />}
      </ErrorBoundary>
    </div>
  );
}
