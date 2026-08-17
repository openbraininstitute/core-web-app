import type { TFilterModel } from '@/features/data-grid/core/domain/filter-model';
import type { TSortModel } from '@/features/data-grid/core/domain/sort-model';

export interface IFacetBucket {
  id: string;
  label: string;
  count: number;
  /** facet type hint ('mtype'/'etype'/…), used to fetch a per-option definition */
  type?: string | null;
}

export type TFacets = Record<string, IFacetBucket[]>;

/**
 * Abstract, transport-agnostic request. A {@link IGridDataSource} resolves it into
 * a real call (REST, GraphQL, in-memory, …).
 */
export interface IGridQuery {
  /** 1-indexed page number */
  page: number;
  pageSize: number;
  sort: TSortModel;
  filters: TFilterModel;
  /** free-text quick filter (a binding maps this to e.g. search / ilike_search) */
  quickFilter?: string;
  /**
   * Opaque, host-provided params merged into the request by the data source
   * (e.g. brain-region id, scope filters, `with_facets`, extra query params).
   * The core never interprets these.
   */
  params?: Record<string, unknown>;
}

export interface IGridPage<Row> {
  rows: Row[];
  /** total number of matching rows (drives pagination, and any count shown outside) */
  total: number;
  /**
   * `true` when the source ignores `page`/`pageSize` and returns everything in one go
   */
  singlePage?: boolean;
  facets?: TFacets;
}
