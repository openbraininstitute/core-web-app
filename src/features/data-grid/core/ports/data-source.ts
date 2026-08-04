import type { IGridPage, IGridQuery } from '../domain/query';

/**
 * The data port: implementations resolve an abstract {@link IGridQuery} into a real
 * fetch (entitycore REST, an in-memory list, …).
 */
export interface IGridDataSource<Row> {
  fetch(query: IGridQuery, signal?: AbortSignal): Promise<IGridPage<Row>>;
}
