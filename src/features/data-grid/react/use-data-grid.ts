import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { buildGridQuery } from '@/features/data-grid/core';

import type { UseQueryOptions } from '@tanstack/react-query';
import type {
  GridController,
  IGridDataSource,
  IGridPage,
  IGridQuery,
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

/** How long a facet answer is reused before the buckets are asked for again. */
const FACETS_STALE_MS = 5 * 60 * 1000;

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
  /** see {@link IGridPage.singlePage} — the source returned everything at once. */
  singlePage: boolean;
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

  // Facets ride their own request so the rows never wait on them, and are keyed WITHOUT
  // page/sort/search: those change what is shown, never which buckets exist, and
  // refetching per page or per keystroke is exactly the cost this split removes. A
  // facet call is the most expensive request entitycore serves (7 s on average, up to
  // 37 s on the synthesized-morphology listing, measured 27 Oct 2026), and the host's
  // own facets request in browse-entity-grid already ignores the search term.
  const fetchFacets = dataSource.fetchFacets;
  const facetsQuery: IGridQuery = {
    ...query,
    page: 1,
    pageSize: 0,
    sort: [],
    freeTextSearch: undefined,
  };
  // Only the error-shaped options carry over: the rest of `queryOptions` (`select`,
  // `placeholderData`, every `refetchOn*` predicate) is generic over the ROW page and
  // would pin this query to that type. A host wanting different facet caching has
  // `staleTime` on its own layer.
  const { retry, retryDelay } = queryOptions ?? {};
  const facetsResult = useQuery({
    retry,
    retryDelay,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    // Buckets change when data is registered, not when a user looks away and back.
    staleTime: FACETS_STALE_MS,
    refetchOnWindowFocus: false,
    queryKey: [...queryKey, 'facets', facetsQuery],
    queryFn: ({ signal }) => fetchFacets?.(facetsQuery, signal) ?? Promise.resolve(undefined),
    enabled: enabled && Boolean(fetchFacets),
  });

  return {
    state,
    rows: result.data?.rows ?? [],
    total: result.data?.total ?? 0,
    singlePage: result.data?.singlePage ?? false,
    // a source that still answers with facets on `fetch` keeps working unchanged
    facets: result.data?.facets ?? facetsResult.data,
    loading: result.isFetching,
    error: result.error,
    status: result.status,
    fetchStatus: result.fetchStatus,
  };
}
