import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import type { Facets, GridController, GridDataSource, GridState } from '../core';

export interface UseDataGridArgs<Row> {
  controller: GridController<Row>;
  dataSource: GridDataSource<Row>;
  /** opaque, host-provided request params (brain-region, scope, with_facets, …) */
  params?: Record<string, unknown>;
  enabled?: boolean;
  /** stable base key; the built query is appended so changes refetch */
  queryKey: ReadonlyArray<unknown>;
  keepPrevious?: boolean;
}

export interface UseDataGridResult<Row> {
  state: GridState;
  rows: Row[];
  total: number;
  facets?: Facets;
  loading: boolean;
  error: unknown;
  status: 'pending' | 'error' | 'success';
  fetchStatus: 'fetching' | 'paused' | 'idle';
}

/**
 * Bridges the headless store to React (via `useSyncExternalStore`) and the data
 * port to React Query. Data fetching/caching lives here — the controller stays
 * pure. State changes rebuild the query, which changes the query key and refetches.
 */
export function useDataGrid<Row>(args: UseDataGridArgs<Row>): UseDataGridResult<Row> {
  const { controller, dataSource, params, enabled = true, queryKey, keepPrevious = true } = args;

  const state = useSyncExternalStore(
    controller.store.subscribe,
    controller.store.getSnapshot,
    controller.store.getSnapshot
  );

  const query = controller.buildQuery(params);

  const result = useQuery({
    queryKey: [...queryKey, query],
    queryFn: ({ signal }) => dataSource.fetch(query, signal),
    enabled,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });

  return {
    state,
    rows: result.data?.rows ?? [],
    total: result.data?.total ?? 0,
    facets: result.data?.facets,
    loading: result.isFetching,
    error: result.error,
    status: result.status,
    fetchStatus: result.fetchStatus,
  };
}
