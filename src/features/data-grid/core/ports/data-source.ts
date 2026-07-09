import type { GridPage, GridQuery } from '../domain/query';

/**
 * The data port. Implementations resolve an abstract {@link GridQuery} into a real
 * fetch (entitycore REST, an in-memory list, a GraphQL call, …). Swapping the data
 * source — e.g. paged → AG Grid Infinite Row Model — never touches the core or the
 * call sites.
 */
export interface GridDataSource<Row> {
  fetch(query: GridQuery, signal?: AbortSignal): Promise<GridPage<Row>>;
}
