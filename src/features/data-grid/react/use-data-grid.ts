import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { buildGridQuery } from '@/features/data-grid/core';

import type { UseQueryOptions } from '@tanstack/react-query';
import type {
  GridController,
  IGridDataSource,
  IGridPage,
  IGridState,
  TFacets,
} from '@/features/data-grid/core';

/**
 * Extra React Query knobs a host may pass through to the grid's list query. The grid
 * always owns `queryKey`/`queryFn`; its other defaults can be overridden here.
 */
export type TDataGridQueryOptions<Row> = Omit<
  UseQueryOptions<IGridPage<Row>, unknown, IGridPage<Row>, ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn'
>;

export interface IUseDataGridArgs<Row> {
  controller: GridController<Row>;
  dataSource: IGridDataSource<Row>;
  /** opaque, host-provided request params (brain-region, scope, with_facets, …) */
  params?: Record<string, unknown>;
  enabled?: boolean;
  /** stable base key; the built query is appended so changes refetch */
  queryKey: ReadonlyArray<unknown>;
  keepPrevious?: boolean;
  /** pass-through React Query options (refetchOnWindowFocus, staleTime, retry, …) */
  queryOptions?: TDataGridQueryOptions<Row>;
}

export interface IUseDataGridResult<Row> {
  state: IGridState;
  rows: Row[];
  total: number;
  facets?: TFacets;
  loading: boolean;
  error: unknown;
  status: 'pending' | 'error' | 'success';
  fetchStatus: 'fetching' | 'paused' | 'idle';
}

/**
 * Bridges the headless store to React (`useSyncExternalStore`) and the data port to
 * React Query, so the controller stays pure. A state change rebuilds the query, which
 * changes the query key and refetches.
 */
export function useDataGrid<Row>(args: IUseDataGridArgs<Row>): IUseDataGridResult<Row> {
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

  // Derive from the reactive `state`, never `controller.buildQuery()`: that reads the
  // store invisibly, so the React Compiler memoizes it against the stable `controller`
  // reference and every refetch freezes at page 1.
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
