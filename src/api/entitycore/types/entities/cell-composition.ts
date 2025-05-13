type NeuronComposition = {
  neuron: {
    density: number;
    count: number;
  };
};

type CellCompositionBrainRegionEType = {
  label: string;
  about: 'EType';
  composition: NeuronComposition;
};

type CellCompositionMType = {
  label: string;
  about: 'MType';
  hasPart: Record<string, CellCompositionBrainRegionEType>;
};

type CellCompositionBrainRegion = {
  label: string;
  notation: string;
  about: 'BrainRegion';
  name: string;
  hasPart: Record<string, CellCompositionMType>;
};

type UnitCode = {
  density: string;
};

export interface ICellCompositionRoot {
  version: number;
  unitCode: UnitCode;
  hasPart: Record<string, CellCompositionBrainRegion>;
}

export type CellCompositionHierarchyView = {
  '@id': string;
  label: string;
  description: string;
  hasParentHierarchyProperty: string;
  hasChildrenHierarchyProperty: string;
  hasLeafHierarchyProperty: string;
};

export type CellCompositionHierarchyOntologyView = {
  id: string;
  leafProperty: string;
  parentProperty: string;
  childrenProperty: string;
  title: string;
};

type CellCompositionAtlasRelease = {
  '@id': string;
  '@type': string;
  _rev: number;
};

type CellCompositionRegionVolume = {
  unitCode: string;
  value: number;
};

export type CellCompositionDefinesItem = {
  '@id': string;
  '@type': string;
  atlas_id: number;
  color_hex_triplet: string;
  graph_order: number;
  hemisphere_id: number;
  st_level: number;
  hasPart: string[];
  identifier: string;
  isPartOf: Array<string>;
  isDefinedBy: string;
  subClassOf: Array<string>;
  regionVolume: CellCompositionRegionVolume;
  regionVolumeRatioToWholeBrain: CellCompositionRegionVolume;
  representedInAnnotation: boolean;
  hasLeafRegionPart: Array<string>;
  hasHierarchyView: Array<string>;
  prefLabel: string;
  label: string;
  notation: string;
  altLabel: string;
  isLayerPartOf: string;
  hasLayerPart: Array<string>;
  atlasRelease: CellCompositionAtlasRelease;
};

export interface ICellCompositionOntologyRoot {
  '@context': string;
  '@id': string;
  '@type': string;
  versionInfo: string;
  hasHierarchyView: CellCompositionHierarchyView[];
  atlasRelease: CellCompositionAtlasRelease;
  defines: CellCompositionDefinesItem[];
  derivation?: Record<string, unknown>[];
  label: string;
}
