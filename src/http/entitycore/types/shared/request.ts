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