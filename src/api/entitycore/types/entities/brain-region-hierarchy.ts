import type {
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';

/**
 * Species information associated with a brain region hierarchy
 */
export interface IBrainRegionHierarchySpecies {
  id: string;
  name: string;
  taxonomy_id: string;
}

/**
 * Single brain region hierarchy with species information
 */
export interface IBrainRegionHierarchyWithSpecies
  extends EntityCoreIdentifiable,
    Timestamps,
    EntityCoreOwnership {
  name: string;
  species: IBrainRegionHierarchySpecies;
  strain: unknown;
}

/**
 * Paginated response for brain region hierarchies with species
 */
export type IBrainRegionHierarchiesResponse = EntityCoreResponse<IBrainRegionHierarchyWithSpecies>;
