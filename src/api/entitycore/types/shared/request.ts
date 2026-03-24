import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';

export type TimestampsFilter = {
  creation_date__lte: Date | null;
  creation_date__gte: Date | null;
  update_date__lte: Date | null;
  update_date__gte: Date | null;
};

export type BrainLocationFilter = {
  brain_location_id: number | null;
};

export const BrainRegionDirection = {
  ASCENDANTS: 'ascendants',
  DESCENDANTS: 'descendants',
  ASCENDANTS_AND_DESCENDANTS: 'ascendants_and_descendants',
} as const;
export type TBrainRegionDirection =
  (typeof BrainRegionDirection)[keyof typeof BrainRegionDirection];

export type BrainRegionFilter = {
  // Brain region
  brain_region__name?: string | null;
  brain_region__name__in?: string[] | null;
  brain_region__name__ilike?: string | null;
  brain_region__id?: string | null; // UUID
  brain_region__id__in?: string[] | null;
  brain_region__acronym?: string | null;
  brain_region__acronym__in?: string[] | null;
  brain_region__annotation_value?: number | null;
  brain_region__hierarchy_id?: string | null; // UUID
};

export type BrainRegionHierarchyFilter = {
  within_brain_region_hierarchy_id: string;
  within_brain_region_brain_region_id: string;
  within_brain_region_direction: TBrainRegionDirection;
  /**
   * @deprecated Use `within_brain_region_direction` instead.
   */
  within_brain_region_ascendants?: boolean;
};

export type ContributionFilter = {
  contribution__id: string | null;
  contribution__pref_label: string | null;
  contribution__pref_label__in: string | null;
  contribution__order_by: string | null;
};
export type PaginationFilter = {
  page: number;
  page_size: number;
};
export type IlikeSearchFilter = {
  ilike_search: string | null;
};
export type SpeciesFilter = {
  species__id: string | null;
  species_id__in: number | null;
  species__name: string | null;
  species__name__in: string | null;
  species__name__ilike: string | null;
  species__order_by: string | null;
};

export type StainFilter = {
  strain__id: string | null;
  strain__name: string | null;
  strain__name__in: string | null;
  strain__order_by: string | null;
  strain__name__ilike: string | null;
};

export type IdFilter = Partial<{
  id: string;
  id__in: string | Array<string>;
}>;

export type SearchFilter = {
  search: string | null;
};

export type NameFilter = {
  name: string | null;
  name__ilike: string | null;
  name__in: string | null;
  order_by: string;
};

export interface SharedFilter extends SearchFilter, NameFilter {}

export type EtypeFilter = {
  etype__id: string | null;
  etype__pref_label: string | null;
  etype__pref_label__in: Array<string> | null;
  etype__order_by: Array<string> | null; //  ["pref_label"]
};

export type MtypeFilter = {
  mtype__id: string | null;
  mtype__id__in?: string[] | null;
  mtype__pref_label: string | null;
  mtype__pref_label__ilike?: string | null;
  mtype__pref_label__in: Array<string> | null;
  mtype__order_by: Array<string> | null; //  ["pref_label"]
};

export type IDFilter = {
  id: string | null;
  id__in: string | Array<string> | null;
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

export type CreatorFilter = {};

export interface OwnershipFilter {
  // Created by
  created_by__pref_label?: string | null;
  created_by__pref_label__in?: string[] | null;
  created_by__pref_label__ilike?: string | null;
  created_by__id?: string | null; // UUID
  created_by__id__in?: string[] | null;
  created_by__type?: string | null;
  created_by__given_name?: string | null;
  created_by__given_name__ilike?: string | null;
  created_by__family_name?: string | null;
  created_by__family_name__ilike?: string | null;
  created_by__sub_id?: string | null; // UUID
  created_by__sub_id_in?: string[] | null;
  // Updated by
  updated_by__pref_label?: string | null;
  updated_by__pref_label__in?: string[] | null;
  updated_by__pref_label__ilike?: string | null;
  updated_by__id?: string | null; // UUID
  updated_by__id_in?: string[] | null;
  updated_by__type?: string | null;
  updated_by__given_name?: string | null;
  updated_by__given_name__ilike?: string | null;
  updated_by__family_name?: string | null;
  updated_by__family_name__ilike?: string | null;
  updated_by__sub_id?: string | null; // UUID
  updated_by__sub_id__in?: string[] | null;
  // Order by
  created_by__order_by?: string | null;
  updated_by__order_by?: string | null;
}

export interface IEntityFilter
  extends IDFilter,
    OwnershipFilter,
    TimestampsFilter,
    ContributionFilter {}

export type EntityCoreTypeFilter = {
  type: TEntityTypeDict;
};

export type SubjectFilter = {
  // Subject identifiers and naming
  subject__id: string | null;
  subject__id__in: string | Array<string> | null;
  subject__name: string | null;
  subject__name__ilike: string | null;
  subject__name__in: string | null;

  // Subject age
  subject__age_value: number | null;

  // Nested species filter (prefixed)
  subject__species__id: string | null;
  subject__species_id__in: number | null;
  subject__species__name: string | null;
  subject__species__name__in: string | null;
  subject__species__name__ilike: string | null;

  // Nested strain filter (prefixed)
  subject__strain__id: string | null;
  subject__strain__name: string | null;
  subject__strain__name__in: string | null;
  subject__strain__name__ilike: string | null;
};

export type PrefLabelFilter = {
  pref_label: string | null;
  pref_label__in: Array<string> | null;
  pref_label__ilike: string | null;
};

export type AlternativeNameFilter = {
  alternative_name: string | null;
};

export type PersonNameFilter = {
  given_name: string | null;
  given_name__in: Array<string> | null;
  given_name__ilike: string | null;
  family_name: string | null;
  family_name__in: Array<string> | null;
  family_name__ilike: string | null;
};

export type ExperimentDateFilter = {
  experiment_date__lte: Date | null;
  experiment_date__gte: Date | null;
};
