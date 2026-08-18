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

  const entityId = entity.id;
  const entityType = entity.type;
  const currentAssetId = asset?.id;
  // the session is only opened once an asset exists, so this is a placeholder in that case
  const key = `${entityId}-${currentAssetId ?? 'none'}`;

  useEffect(() => {
    if (!currentAssetId) {
      setState(IDLE_TRACE_SESSION_STATE);
      return;
    }

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

  // a missing asset is a result, not a crash: throwing here would take down the tree and skip
  // the hooks below it, when the caller already handles an error it can return
  const missingAssetError = asset ? null : new Error('No NWB file found');

  return {
    ...state,
    error: missingAssetError ?? state.error,
    getSweepSeries,
    getCachedSweepSeries,
  };
}
