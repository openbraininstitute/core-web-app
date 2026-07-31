import type { IGridPage, IGridQuery } from '../domain/query';

/**
 * The data port. Implementations resolve an abstract {@link IGridQuery} into a real
 * fetch (entitycore REST, an in-memory list, a GraphQL call, …). Swapping the data
 * source — e.g. paged → AG Grid Infinite Row Model — never touches the core or the
 * call sites.
 */
export interface IGridDataSource<Row> {
  fetch(query: IGridQuery, signal?: AbortSignal): Promise<IGridPage<Row>>;
}
