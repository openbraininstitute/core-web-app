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
  // NOTE: format: hierarchy_id, hierarchy_name, include_ascendants
  within_brain_region: string;
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
  species_id__in: number | null;
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
  etype__pref_label: string | null;
  etype__pref_label__in: Array<string> | null;
  etype__order_by: Array<string> | null; //  ["pref_label"]
};

export type MtypeFilter = {
  mtype__id: string | null;
  mtype_pref_label: string | null;
  mtype_pref_label__in: Array<string> | null;
  mtype_order_by: Array<string> | null; //  ["pref_label"]
};

export type IDFilter = {
  id__in: string | null;
};

export interface IEModelFilter {
  emodel_creation_date_lte?: string | null;
  emodel_creation_date_gte?: string | null;
  emodel_update_date_lte?: string | null;
  emodel_update_date_gte?: string | null;
  emodel_name__ilike?: string | null;
  emodel_brain_region_id?: number | null;
  emodel_species_id__in?: string | null;
  emodel_score__lte?: number | null;
  emodel_score_gte?: number | null;
  emodel_order_by?: string | null;
}

export interface IMorphologyFilter {
  exemplar_morphology__creation_date_lte?: string | null;
  exemplar_morphology__creation_date_gte?: string | null;
  exemplar_morphology__update_date_lte?: string | null;
  exemplar_morphology__update_date_gte?: string | null;
  exemplar_morphology__name_ilike?: string | null;
  exemplar_morphology__brain_region_id?: number | null;
  exemplar_morphology__species_id__in?: string | null;
  exemplar_morphology__order_by?: string | null;
}
