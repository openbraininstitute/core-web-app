import * as Comlink from 'comlink';
import { useEffect, useMemo, useRef, useState } from 'react';

import { buildAssetDownloadRequest } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { IDatasource } from 'ag-grid-community';
import type {
  ColumnMeta,
  DownloadProgress,
  NodePopulation,
  OpenResponse,
} from '@/features/circuit-nodes/types';
import type { NodesWorkerApi } from '@/features/circuit-nodes/worker/nodes.worker';

type Args = {
  enabled: boolean;
  circuitId: string;
  circuitAssetId: string;
  population: NodePopulation | undefined;
};

type WorkerHandle = {
  worker: Worker;
  proxy: Comlink.Remote<NodesWorkerApi>;
  populationKey: string;
};

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function useNodesWorker({ enabled, circuitId, circuitAssetId, population }: Args) {
  const ctx = useWorkspace();
  const workerRef = useRef<WorkerHandle | null>(null);
  const generationRef = useRef(0);

  const [status, setStatus] = useState<Status>('idle');
  const [openResult, setOpenResult] = useState<OpenResponse | null>(null);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  useEffect(() => {
    if (!enabled || !population || !circuitAssetId || !circuitId) {
      teardownWorker(workerRef);
      setStatus('idle');
      setOpenResult(null);
      setFilteredCount(null);
      setError(null);
      setProgress(null);
      return;
    }

    const generation = ++generationRef.current;
    let cancelled = false;

    setStatus('loading');
    setError(null);
    setProgress(null);

    (async () => {
      try {
        teardownWorker(workerRef);
        if (cancelled) return;

        const { url, headers } = await buildAssetDownloadRequest({
          ctx,
          entityType: EntityTypeDict.Circuit,
          entityId: circuitId,
          id: circuitAssetId,
          assetPath: population.file,
        });
        if (cancelled) return;

        const worker = new Worker(new URL('../worker/nodes.worker.ts', import.meta.url), {
          type: 'module',
        });
        const proxy = Comlink.wrap<NodesWorkerApi>(worker);
        workerRef.current = { worker, proxy, populationKey: population.name };

        const fileKey = `${circuitId}-${circuitAssetId}-${population.name}`;
        const result = await proxy.open(
          {
            populationKey: population.name,
            fileKey,
            url,
            headers,
          },
          Comlink.proxy((next: DownloadProgress) => {
            if (cancelled || generationRef.current !== generation) return;
            setProgress(next);
          })
        );
        if (cancelled || generationRef.current !== generation) return;

        setOpenResult(result);
        setFilteredCount(null);
        setProgress(null);
        setStatus('ready');
      } catch (e) {
        if (cancelled || generationRef.current !== generation) return;
        teardownWorker(workerRef);
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus('error');
        setOpenResult(null);
        setProgress(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, circuitId, circuitAssetId, population, ctx]);

  useEffect(() => {
    return () => teardownWorker(workerRef);
  }, []);

  const datasource = useMemo<IDatasource | null>(() => {
    if (status !== 'ready' || !openResult) return null;
    const proxyRef = workerRef;
    const columns = openResult.columns;
    return {
      rowCount: openResult.rowCount,
      getRows(params) {
        const current = proxyRef.current;
        if (!current) {
          params.failCallback();
          return;
        }
        current.proxy
          .getRows({
            start: params.startRow,
            end: params.endRow,
            sort: (params.sortModel ?? []).map((s) => ({
              column: s.colId,
              direction: s.sort as 'asc' | 'desc',
            })),
            filter: params.filterModel ?? undefined,
            columns: visibleColumnsFromContext(params.context, columns),
          })
          .then((res) => {
            const hasFilter = !!params.filterModel && Object.keys(params.filterModel).length > 0;
            const next = hasFilter ? res.total : null;
            setFilteredCount((prev) => (prev === next ? prev : next));
            const lastRow = res.total <= params.endRow ? res.total : undefined;
            params.successCallback(res.rows, lastRow);
          })
          .catch(() => params.failCallback());
      },
    };
  }, [status, openResult]);

  return {
    rowCount: openResult?.rowCount ?? 0,
    filteredCount,
    columns: openResult?.columns,
    datasource,
    isLoading: status === 'loading',
    progress,
    error,
  };
}

function visibleColumnsFromContext(context: unknown, allColumns: ColumnMeta[]): string[] {
  if (context && typeof context === 'object' && 'visibleColumns' in context) {
    const v = (context as { visibleColumns?: unknown }).visibleColumns;
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
  }
  return allColumns.map((c) => c.name);
}

function teardownWorker(ref: { current: WorkerHandle | null }) {
  const current = ref.current;
  if (!current) return;
  try {
    current.proxy[Comlink.releaseProxy]();
  } catch {
    /* ignore */
  }
  try {
    current.worker.terminate();
  } catch {
    /* ignore */
  }
  ref.current = null;
}
