import { EntityCoreIdentifiable, EntityCoreOwnership, Timestamps } from '../shared/global';

export interface IBrainRegionHierarchyWithSpecies
  extends EntityCoreIdentifiable,
    Timestamps,
    EntityCoreOwnership {
  species: {
    id: string;
    name: string;
    taxonomy_id: string;
  };
  strain: unknown;
}
