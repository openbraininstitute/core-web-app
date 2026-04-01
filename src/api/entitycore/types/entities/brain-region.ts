import type {
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  ISpecies,
  IStrain,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  IDFilter,
  NameFilter,
  PaginationFilter,
  SpeciesFilter,
  TStrainFilter,
} from '@/api/entitycore/types/shared/request';

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
export interface IBrainRegionFilter
  extends IDFilter,
    NameFilter,
    PaginationFilter,
    SpeciesFilter,
    TStrainFilter {
  acronym: string | null;
  acronym__in: string[] | null;
  annotation_value: number | null;
  hierarchy_id: string | null;
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

export interface IBrainRegionHierarchyObject
  extends EntityCoreIdentifiable,
    EntityCoreOwnership,
    Timestamps {
  name: string;
  species: ISpecies;
  strain: IStrain | null;
}

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
