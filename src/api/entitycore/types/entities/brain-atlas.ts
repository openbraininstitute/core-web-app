import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  IAsset,
  ISpecies,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  PaginationFilter,
  SharedFilter,
  SpeciesFilter,
  TimestampsFilter,
  TStrainFilter,
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
    TStrainFilter,
    EntityAuthorization {}

export interface IBrainAtlasRegionFilter extends SharedFilter, PaginationFilter {}
