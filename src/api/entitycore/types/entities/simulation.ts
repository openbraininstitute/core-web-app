import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreType,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type { ISimulationBase } from '@/api/entitycore/types/shared/neuron-simulation';
import type {
  ContributionFilter,
  IDFilter,
  IlikeSearchFilter,
  OwnershipFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

export interface ISimulation
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    ISimulationBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType {}

interface ISimulationFilterBase {
  simulation_campaign_id?: string | null;
  simulation_campaign_id__in?: string[] | null;
}

export interface ICircuitSimulationFilter
  extends ISimulationFilterBase,
    ContributionFilter,
    IDFilter,
    SharedFilter,
    PaginationFilter,
    OwnershipFilter,
    IlikeSearchFilter {}
