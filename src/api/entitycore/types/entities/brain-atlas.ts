import type {
  EntityCoreIdentifiable,
  Timestamps,
  ISpecies,
  IAsset,
} from '@/api/entitycore/types/shared/global';
import {
  PaginationFilter,
  SharedFilter,
  SpeciesFilter,
  StainFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export interface BrainAtlasBase {
  name: string;
  hierarchy_id: string;
  species: ISpecies;
}

export interface IBrainAtlas extends EntityCoreIdentifiable, BrainAtlasBase, Timestamps {}

export interface BrainAtlasRegionBase {
  volume?: number;
  is_leaf_region: boolean;
  brain_atlas_id: string;
  brain_region_id: string;
}

export interface IBrainAtlasRegion extends BrainAtlasRegionBase, Timestamps {
  id: string;
  assets: Array<IAsset>;
}

export interface IBrainAtlasFilter
  extends SharedFilter,
    TimestampsFilter,
    SpeciesFilter,
    StainFilter {}

export interface IBrainAtlasRegionFilter extends SharedFilter, PaginationFilter {}
