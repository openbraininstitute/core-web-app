import type {
  ContributionFilter,
  IDFilter,
  NameFilter,
  OwnershipFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';
import type {
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  IContributor,
  Timestamps,
} from '../shared/global';

type Density = {
  density: number;
  count: number;
};

type NeuronComposition = {
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

export interface ICellComposition
  extends EntityCoreType,
    EntityCoreIdentifiable,
    EntityCoreOwnership,
    Timestamps,
    EntityCoreBaseAsset {
  name: string;
  description: string;
  contributions?: Array<IContributor> | null;
}
export interface ICellCompositionFilter
  extends IDFilter,
    NameFilter,
    TimestampsFilter,
    OwnershipFilter,
    ContributionFilter {}
