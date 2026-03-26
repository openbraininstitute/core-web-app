import type { ISpecies, IStrain } from '@/api/entitycore/types/shared/global';
import type { PaginationFilter } from '@/api/entitycore/types/shared/request';

export interface IBrainRegion {
  id: string;
  name: string;
  acronym: string;
  parent_structure_id: string;
  color_hex_triplet: string;
  annotation_value: number;
  hierarchy_id: string;
  species: ISpecies;
  strain: IStrain | null;
}
export interface IBrainRegionFilter extends PaginationFilter {
  acronym: string | null;
  acronym__in: string[] | null;
  annotation_value: number | null;
  hierarchy_id: string | null;
  species_id__in: string[] | null;
  species__name: string | null;
  species__name__in: string[] | null;
  species__name__ilike: string | null;
  species__id: string | null;
  species__id__in: string[] | null;
  strain__name: string | null;
  strain__name__in: string[] | null;
  strain__name__ilike: string | null;
  strain__id: string | null;
  strain__id__in: string[] | null;
}

export type BrainRegionHierarchyBase = {
  id: string;
  name: string;
  acronym: string;
  parent_structure_id: string;
  color_hex_triplet: string;
  annotation_value: number;
  hierarchy_id: string;
};
export interface IBrainRegionHierarchy extends BrainRegionHierarchyBase {
  children: Array<IBrainRegionHierarchy>;
}

// order of values: id: number, name: string, acronym: string, children: Array, level: number
export type TemporaryFlatBrainRegionHierarchy = Array<
  [number, string, string, Array<number>, number]
>;

// TODO: temporary placing this here, remove it after get the correct implementation  from entity-core
type DefaultBrainViewId = 'https://neuroshapes.org/BrainRegion';
type BrainLayerViewId = 'https://bbp.epfl.ch/ontologies/core/bmo/BrainLayer';
type BrainViewId = DefaultBrainViewId | BrainLayerViewId;

type Ancestor = Record<string, BrainViewId>;

export interface ITemporaryBrainRegionHierarchy {
  id: string;
  isPartOf: string | null;
  isLayerPartOf: string | null;
  title: string;
  notation: string;
  colorCode: string;
  items?: ITemporaryBrainRegionHierarchy[];
  leaves?: string[];
  ancestors?: Ancestor[];
  hasLayerPart: string[];
  hasPart: string[];
  view?: BrainViewId;
  representedInAnnotation?: boolean; // This property is removed for brainRegionsWithRepresentationAtom
  volume: number;
}
