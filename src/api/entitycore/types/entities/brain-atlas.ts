import type {
  EntityCoreIdentifiable,
  Timestamps,
  ISpecies,
  IAsset,
  EntityAuthorization,
} from '@/api/entitycore/types/shared/global';
import {
  PaginationFilter,
  SharedFilter,
  SpeciesFilter,
  StainFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

interface BrainAtlasBase {
  name: string;
  hierarchy_id: string;
  species: ISpecies;
}

export interface IBrainAtlas extends EntityCoreIdentifiable, BrainAtlasBase, Timestamps {}

interface BrainAtlasRegionBase {
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
    StainFilter,
    EntityAuthorization {}

export interface IBrainAtlasRegionFilter extends SharedFilter, PaginationFilter {}
