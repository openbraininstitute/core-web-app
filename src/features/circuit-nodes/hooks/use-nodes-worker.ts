import { useCallback, useEffect, useMemo, useState } from 'react';

import { buildAssetDownloadRequest } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import {
  IDLE_SESSION_STATE,
  type NodesSessionState,
  nodesWorkerRegistry,
} from '@/features/circuit-nodes/hooks/nodes-worker-manager';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { IDatasource } from 'ag-grid-community';
import type { ColumnMeta, NodePopulation } from '@/features/circuit-nodes/types';

type Args = {
  enabled: boolean;
  circuitId: string;
  circuitAssetId: string;
  population: NodePopulation | undefined;
};

/**
 * read a circuit's SONATA node population through a shared worker session
 * the session is keyed by circuit/asset/population and
 * reused across every consumer of the same key, so the table and the colour-by
 * dropdown download the file once, not twice, so consumers always see fresh data
 */
export function useNodesWorker({ enabled, circuitId, circuitAssetId, population }: Args) {
  const ctx = useWorkspace();
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [state, setState] = useState<NodesSessionState>(IDLE_SESSION_STATE);

  const key =
    enabled && population && circuitAssetId && circuitId
      ? `${circuitId}-${circuitAssetId}-${population.name}`
      : null;

  useEffect(() => {
    if (!key || !population) {
      setState(IDLE_SESSION_STATE);
      return;
    }

    const populationName = population.name;
    const populationFile = population.file;
    const buildRequest = async () => {
      const { url, headers } = await buildAssetDownloadRequest({
        ctx,
        entityType: EntityTypeDict.Circuit,
        entityId: circuitId,
        id: circuitAssetId,
        assetPath: populationFile,
      });
      return { url, headers };
    };

    nodesWorkerRegistry.acquire(key, { populationKey: populationName, buildRequest });
    const sync = () => setState(nodesWorkerRegistry.getState(key));
    const unsubscribe = nodesWorkerRegistry.subscribe(key, sync);
    sync();
    setFilteredCount(null);

    return () => {
      unsubscribe();
      nodesWorkerRegistry.release(key);
    };
  }, [key, ctx, circuitId, circuitAssetId, population]);

  const datasource = useMemo<IDatasource | null>(() => {
    if (!key || state.status !== 'ready' || !state.columns) return null;
    const columns = state.columns;
    return {
      rowCount: state.rowCount,
      getRows(params) {
        nodesWorkerRegistry
          .getRows(key, {
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
  }, [key, state.status, state.columns, state.rowCount]);

  const getColumn = useMemo(() => {
    return async (name: string) => {
      if (!key) throw new Error('Nodes worker not ready');
      return nodesWorkerRegistry.getColumn(key, name);
    };
  }, [key]);

  const retry = useCallback(() => {
    if (key) nodesWorkerRegistry.retry(key);
  }, [key]);

  return {
    rowCount: state.rowCount,
    filteredCount,
    columns: state.columns,
    datasource,
    getColumn,
    status: state.status,
    isLoading: state.status === 'loading',
    progress: state.progress,
    error: state.error,
    retry,
  };
}

function visibleColumnsFromContext(context: unknown, allColumns: ColumnMeta[]): string[] {
  if (context && typeof context === 'object' && 'visibleColumns' in context) {
    const v = (context as { visibleColumns?: unknown }).visibleColumns;
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
  }
  return allColumns.map((c) => c.name);
}
