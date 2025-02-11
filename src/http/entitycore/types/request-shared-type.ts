export type DateFilter = {
  creation_date__lte?: Date | null;
  creation_date__gte?: Date | null;
  update_date__lte?: Date | null;
  update_date__gte?: Date | null;
};

export type BrainLocationFilter = {
  brain_location_id?: number | null;
};

export type BrainRegionFilter = {
  brain_region_id?: number | null;
};

export type PaginationFilter = {
  page: number;
  page_size: number;
};

export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
}

// Mapping from attribute -> { distinctValue: count }
// ex: "mType": { "L5_TPC": 10, "L6_BAC": 1 }
export type Facets = Record<string, Record<string, number>>;

export interface EntityCoreResponse<T> {
  data: Array<T>;
  pagination: Pagination;
  facets?: Facets;
}
