import { useCallback, useEffect, useState } from 'react';

import { buildAssetDownloadRequest } from '@/api/entitycore/queries/assets';
import {
  IDLE_TRACE_SESSION_STATE,
  nwbWorkerRegistry,
  type TraceSessionState,
} from '@/features/ephys-viewer/hooks/nwb-worker-manager';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { SweepSeriesRequest, SweepSeriesResponse } from '@/features/ephys-viewer/trace-index';
import type { WorkspaceContext } from '@/types/common';

type UseTraceArgs = {
  entity: IElectricalCellRecording | ISimulationResult;
  assetId?: string;
  ctx?: WorkspaceContext;
};

export type UseTraceResult = TraceSessionState & {
  getSweepSeries: (req: SweepSeriesRequest) => Promise<SweepSeriesResponse>;
  getCachedSweepSeries: (req: SweepSeriesRequest) => SweepSeriesResponse | null;
};

/**
 * Open an entity's NWB asset in a worker and expose its structure.
 *
 * The worker downloads the file itself, streaming it into its own Emscripten FS, so the only
 * thing the main thread ever holds is the trace index and whatever decimated series it asks
 * for. Building the download request stays here because it needs the NextAuth session.
 */
export default function useTrace({ entity, assetId, ctx }: UseTraceArgs): UseTraceResult {
  const [state, setState] = useState<TraceSessionState>(IDLE_TRACE_SESSION_STATE);

  const asset = assetId
    ? entity.assets?.find((a) => a.id === assetId)
    : entity.assets?.find((a) => a.content_type === 'application/nwb');

  if (!asset) {
    throw new Error('No NWB file found');
  }

  const entityId = entity.id;
  const entityType = entity.type;
  const { id: currentAssetId } = asset;
  const key = `${entityId}-${currentAssetId}`;

  useEffect(() => {
    const buildRequest = () =>
      buildAssetDownloadRequest({
        ctx,
        entityType,
        entityId,
        id: currentAssetId,
      });

    nwbWorkerRegistry.acquire(key, { buildRequest });
    const sync = () => setState(nwbWorkerRegistry.getState(key));
    const unsubscribe = nwbWorkerRegistry.subscribe(key, sync);
    sync();

    return () => {
      unsubscribe();
      nwbWorkerRegistry.release(key);
    };
  }, [key, ctx, entityId, entityType, currentAssetId]);

  const getSweepSeries = useCallback(
    (req: SweepSeriesRequest) => nwbWorkerRegistry.getSweepSeries(key, req),
    [key]
  );

  const getCachedSweepSeries = useCallback(
    (req: SweepSeriesRequest) => nwbWorkerRegistry.getCachedSweepSeries(key, req),
    [key]
  );

  return { ...state, getSweepSeries, getCachedSweepSeries };
}
