import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

import { buildAssetDownloadRequest } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { useNodesSessionKeeper } from '@/features/circuit-nodes/hooks/nodes-session-keeper';
import {
  IDLE_SESSION_STATE,
  type NodesOpenParams,
  nodesWorkerRegistry,
} from '@/features/circuit-nodes/hooks/nodes-worker-manager';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { IDatasource } from 'ag-grid-community';
import type {
  ColumnMeta,
  DerivedColumn,
  FilterModel,
  NodeGeometryOptions,
  NodePopulation,
  SortItem,
} from '@/features/circuit-nodes/types';
import type { WorkspaceContext } from '@/types/common';

type Args = {
  enabled: boolean;
  circuitId: string;
  circuitAssetId: string;
  population: NodePopulation | undefined;
};

/**
 * Registry key of a population's session: one per circuit, asset and
 * population. Every reader (the nodes table, colour-by, the viewers) shares
 * the session, so the file is downloaded once.
 */
export function nodesSessionKey(
  circuitId: string,
  circuitAssetId: string,
  populationName: string
): string {
  return `${circuitId}-${circuitAssetId}-${populationName}`;
}

/** Arguments for opening that session: the population, and a signed download of its file. */
export function nodesOpenParams(
  ctx: WorkspaceContext,
  circuitId: string,
  circuitAssetId: string,
  population: NodePopulation
): NodesOpenParams {
  return {
    populationKey: population.name,
    buildRequest: () =>
      buildAssetDownloadRequest({
        ctx,
        entityType: EntityTypeDict.Circuit,
        entityId: circuitId,
        id: circuitAssetId,
        assetPath: population.file,
      }),
  };
}

/**
 * read a circuit's SONATA node population through a shared worker session
 * the session is keyed by circuit/asset/population and
 * reused across every consumer of the same key, so the table and the colour-by
 * dropdown download the file once, not twice, so consumers always see fresh data
 */
export function useNodesWorker({ enabled, circuitId, circuitAssetId, population }: Args) {
  const ctx = useWorkspace();
  const keep = useNodesSessionKeeper();
  const key =
    enabled && population && circuitAssetId && circuitId
      ? nodesSessionKey(circuitId, circuitAssetId, population.name)
      : null;

  // Acquired here: the registry has no session to subscribe to until then.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!key || !population) return () => {};
      const params = nodesOpenParams(ctx, circuitId, circuitAssetId, population);
      nodesWorkerRegistry.acquire(key, params);
      // Held open past this reader too, where a page keeps the populations it reads.
      keep?.(key, params);
      const unsubscribe = nodesWorkerRegistry.subscribe(key, onChange);
      return () => {
        unsubscribe();
        nodesWorkerRegistry.release(key);
      };
    },
    [key, ctx, circuitId, circuitAssetId, population, keep]
  );
  const state = useSyncExternalStore(subscribe, () =>
    key ? nodesWorkerRegistry.getState(key) : IDLE_SESSION_STATE
  );

  // Kept with its key, like `state`, so a new population never shows the last one's count.
  const [filtered, setFiltered] = useState<{ key: string; count: number | null } | null>(null);
  const filteredCount = filtered && filtered.key === key ? filtered.count : null;

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
            const count = hasFilter ? res.total : null;
            setFiltered((previous) =>
              previous?.key === key && previous.count === count ? previous : { key, count }
            );
            const lastRow = res.total <= params.endRow ? res.total : undefined;
            params.successCallback(res.rows, lastRow);
          })
          .catch(() => params.failCallback());
      },
    };
  }, [key, state.status, state.columns, state.rowCount]);

  const getColumn = useCallback(
    async (name: string) => {
      if (!key) throw new Error('Nodes worker not ready');
      return nodesWorkerRegistry.getColumn(key, name);
    },
    [key]
  );

  const getGeometry = useCallback(
    async (options?: NodeGeometryOptions) => {
      if (!key) throw new Error('Nodes worker not ready');
      return nodesWorkerRegistry.getGeometry(key, options);
    },
    [key]
  );

  const setDerivedColumns = useCallback(
    async (owner: string, derived: DerivedColumn[]) => {
      if (!key) throw new Error('Nodes worker not ready');
      return nodesWorkerRegistry.setDerivedColumns(key, owner, derived);
    },
    [key]
  );

  const getFilteredIndices = useCallback(
    async (filter: FilterModel) => {
      if (!key) throw new Error('Nodes worker not ready');
      return nodesWorkerRegistry.getFilteredIndices(key, filter);
    },
    [key]
  );

  const getRowIndex = useCallback(
    async (nodeId: number, sort: SortItem[], filter: FilterModel) => {
      if (!key) throw new Error('Nodes worker not ready');
      return nodesWorkerRegistry.getRowIndex(key, nodeId, sort, filter);
    },
    [key]
  );

  const retry = useCallback(() => {
    if (key) nodesWorkerRegistry.retry(key);
  }, [key]);

  return {
    rowCount: state.rowCount,
    filteredCount,
    columns: state.columns,
    datasource,
    getColumn,
    getGeometry,
    setDerivedColumns,
    getFilteredIndices,
    getRowIndex,
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
