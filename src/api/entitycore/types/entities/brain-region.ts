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
  children: IBrainRegionHierarchy[];
}

// order of values: id: number, name: string, acronym: string, children: Array, level: number
export type TemporaryFlatBrainRegionHierarchy = [number, string, string, number[], number][];

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
