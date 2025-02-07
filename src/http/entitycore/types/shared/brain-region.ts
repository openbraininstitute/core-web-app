import { IAuditMetadata } from '@/http/entitycore/types/shared/global';

type BrainRegionHierarchy = {
  name: string;
  acronym: string;
  children: number[];
};

export interface IBrainRegionHierarchy extends BrainRegionHierarchy, IAuditMetadata { }

// order of values: id: number, name: string, acronym: string, children: Array, level: number
export type TemporaryFlatBrainRegionHierarchy = Array<
  [number, string, string, Array<number>, number]
>;

// TODO: temporary placing this here, remove it after get the correct implementation  from entity-core
export type DefaultBrainViewId = 'https://neuroshapes.org/BrainRegion';
export type BrainLayerViewId = 'https://bbp.epfl.ch/ontologies/core/bmo/BrainLayer';
export type BrainViewId = DefaultBrainViewId | BrainLayerViewId;

export type Ancestor = Record<string, BrainViewId>;

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
}
