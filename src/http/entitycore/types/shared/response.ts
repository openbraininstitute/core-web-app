

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
