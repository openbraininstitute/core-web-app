export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
}

type Facet = {
  id: string;
  label: string;
  count: number;
  type?: string | null;
};

export type Facets = Record<string, Array<Facet>>;
export interface EntityCoreResponse<T> {
  data: Array<T>;
  pagination: Pagination;
  facets?: Facets;
}
