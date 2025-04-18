export type TimestampsFilter = {
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

export type SpeciesFilter = {
  species__id: string | null;
  species__name: string | null;
  species__name__in: string | null;
  species__order_by: string | null;
};

export type StainFilter = {
  strain__id: string | null;
  strain__name: string | null;
  strain__name__in: string | null;
  strain__order_by: string | null;
};

export type SharedFilter = {
  name__ilike: string | null;
  order_by: string;
  search: string | null;
};

export type EtypeFilter = {
  etype__id: string | null;
  pref_label: string | null;
  pref_label__in: Array<string> | null;
  order_by: Array<string> | null; //  ["pref_label"]
};

export type MtypeFilter = {
  mtype__id: string | null;
  pref_label: string | null;
  pref_label__in: Array<string> | null;
  order_by: Array<string> | null; //  ["pref_label"]
};
