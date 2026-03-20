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

interface ISimulationResultBase {
  name: string;
  description: string;
  simulation_id: string;
}

export interface ISimulationResult
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    ISimulationResultBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType {}

export interface ISimulationResultFilter
  extends ContributionFilter,
    BrainRegionHierarchyFilter, // Entitycore API doesn't support brain_region_id filtering, to be removed
    SharedFilter,
    PaginationFilter,
    OwnershipFilter {}
