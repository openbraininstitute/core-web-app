import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreType,
  Timestamps,
} from "@/api/entitycore/types/shared/global";
import type { ICircuitSimulationBase } from "@/api/entitycore/types/shared/neuron-simulation";
import type {
  ContributionFilter,
  SharedFilter,
  PaginationFilter,
  OwnershipFilter,
  IlikeSearchFilter,
} from "@/api/entitycore/types/shared/request";

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
    SharedFilter,
    PaginationFilter,
    OwnershipFilter,
    IlikeSearchFilter {}
