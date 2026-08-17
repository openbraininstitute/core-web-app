import type { IGridPage, IGridQuery, TFacets } from '@/features/data-grid/core/domain/query';

/**
 * The data port: implementations resolve an abstract {@link IGridQuery} into a real
 * fetch (entitycore REST, an in-memory list, …).
 */
export interface IGridDataSource<Row> {
  fetch(query: IGridQuery, signal?: AbortSignal): Promise<IGridPage<Row>>;
  /**
   * Facet buckets for the same query, fetched separately so computing them never
   * delays the rows. A source that returns facets on {@link fetch} (or has none)
   * leaves this undefined.
   */
  fetchFacets?(query: IGridQuery, signal?: AbortSignal): Promise<TFacets | undefined>;
}
