import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { buildGridQuery } from '../core';

import type { UseQueryOptions } from '@tanstack/react-query';
import type { Facets, GridController, GridDataSource, GridPage, GridState } from '../core';

/**
 * Extra React Query knobs a host may pass through to the grid's list query — e.g.
 * `refetchOnWindowFocus`, `staleTime`, `gcTime`, `retry`, `refetchInterval`. The grid
 * always owns `queryKey`/`queryFn` (and its own `enabled`/`placeholderData` defaults,
 * which a caller can still override here).
 */
export type DataGridQueryOptions<Row> = Omit<
  UseQueryOptions<GridPage<Row>, unknown, GridPage<Row>, ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn'
>;

export interface UseDataGridArgs<Row> {
  controller: GridController<Row>;
  dataSource: GridDataSource<Row>;
  /** opaque, host-provided request params (brain-region, scope, with_facets, …) */
  params?: Record<string, unknown>;
  enabled?: boolean;
  /** stable base key; the built query is appended so changes refetch */
  queryKey: ReadonlyArray<unknown>;
  keepPrevious?: boolean;
  /** pass-through React Query options (refetchOnWindowFocus, staleTime, retry, …) */
  queryOptions?: DataGridQueryOptions<Row>;
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
  const {
    controller,
    dataSource,
    params,
    enabled = true,
    queryKey,
    keepPrevious = true,
    queryOptions,
  } = args;

  const state = useSyncExternalStore(
    controller.store.subscribe,
    controller.store.getSnapshot,
    controller.store.getSnapshot
  );

  // Derive the query from the REACTIVE `state` value, not via
  // `controller.buildQuery()`: that method reads the store invisibly, so the React
  // Compiler memoizes its result against the stable `controller` reference and the
  // query (and with it every refetch) freezes at page 1.
  const query = buildGridQuery(state, params);

  const result = useQuery({
    // host overrides first; the grid's key/fn + its enabled/placeholder defaults win
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    ...queryOptions,
    queryKey: [...queryKey, query],
    queryFn: ({ signal }) => dataSource.fetch(query, signal),
    enabled,
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
