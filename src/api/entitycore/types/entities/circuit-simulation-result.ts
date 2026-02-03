import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreType,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionHierarchyFilter,
  ContributionFilter,
  OwnershipFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

interface ICircuitSimulationResultBase {
  name: string;
  description: string;
  simulation_id: string;
}

export interface ICircuitSimulationResult
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    ICircuitSimulationResultBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType {}

// TODO: Add ICircuitSimulationResultBaseFilter

export interface ICircuitSimulationResultFilter
  extends ContributionFilter,
    BrainRegionHierarchyFilter, // Entitycore API doesn't support brain_region_id filtering, to be removed
    SharedFilter,
    PaginationFilter,
    OwnershipFilter {}
