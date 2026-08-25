import { Empty, Spin } from 'antd';
import { useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import useSpikeTrace from '@/features/spike-viewer/hooks/use-spike-trace';
import { useSimulation } from '@/features/spike-viewer/simulation-context';
import { replayableCircuit } from '@/features/spike-viewer/spike-replay/replayable-circuit';
import { SpikeReplayView } from '@/features/spike-viewer/spike-replay/spike-replay-view';
import { withSimulationTimeWindow } from '@/features/spike-viewer/time-window';

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
  const [spikes, error] = useSpikeTrace({ entityId, entityType, asset, ctx });
  const { model, run } = useSimulation();
  // Only a circuit simulation has somewhere to replay spikes; an ion-channel or
  // single-cell campaign gets the raster it has always had, with no toggle
  // offering a view that cannot be drawn.
  const circuit = replayableCircuit(model);
  const data = useMemo(() => spikes && withSimulationTimeWindow(spikes, run), [spikes, run]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-3">
        <Empty description="There was a problem loading the spike data" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center p-3">
        <Spin />
      </div>
    );
  }

  // The panel hands this viewer the bare pane, so the inset is the view's own to
  // lay out — the 3D pane has to run edge to edge for its floating chrome to sit
  // where the circuit preview's does.
  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent} resetKeys={[data]}>
      <SpikeReplayView data={data} circuit={circuit ?? undefined} />
    </ErrorBoundary>
  );
}
