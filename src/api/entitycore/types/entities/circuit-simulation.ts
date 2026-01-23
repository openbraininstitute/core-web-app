import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreType,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type { ICircuitSimulationBase } from '@/api/entitycore/types/shared/neuron-simulation';
import type {
  BrainRegionFilter,
  ContributionFilter,
  IlikeSearchFilter,
  OwnershipFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

export interface ICircuitSimulation
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    ICircuitSimulationBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType {}

interface ICircuitSimulationFilterBase {
  simulation_campaign_id?: string | null;
  simulation_campaign_id__in?: string[] | null;
}

export interface ICircuitSimulationFilter
  extends ICircuitSimulationFilterBase,
    ContributionFilter,
    BrainRegionFilter, // Entitycore API doesn't support brain_region_id filtering, to be removed
    SharedFilter,
    PaginationFilter,
    OwnershipFilter,
    IlikeSearchFilter {}
