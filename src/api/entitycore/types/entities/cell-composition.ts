export type Density = {
  density: number;
  count: number;
};

export type NeuronComposition = {
  neuron: Density;
  glia: Density;
};

export type CellCompositionBrainRegionEType = {
  label: string;
  about: 'EType';
  composition: NeuronComposition;
};

export type CellCompositionMType = {
  label: string;
  about: 'MType';
  hasPart: Record<string, CellCompositionBrainRegionEType>;
};

export type CellCompositionBrainRegion = {
  label: string;
  notation: string;
  about: 'BrainRegion';
  name: string;
  hasPart: Record<string, CellCompositionMType>;
};

export interface ICellCompositionRoot {
  version: number;
  unitCode: {
    density: string;
  };
  hasPart: Record<string, CellCompositionBrainRegion>;
}
