export type DateFilter = {
  creation_date__lte: Date | null;
  creation_date__gte: Date | null;
  update_date__lte: Date | null;
  update_date__gte: Date | null;
};

export type BrainLocationFilter = {
  brain_location_id: number | null;
};

export type BrainRegionFilter = {
  brain_region_id: number | null;
};

export type ContributionFilter = {
  contribution__id: string | null;
  contribution_pref_label: string | null;
  contribution_pref_label__in: string | null;
  contribution__order_by: string | null;
};
export type PaginationFilter = {
  page: number;
  page_size: number;
};
