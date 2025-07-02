import type {
  EntityAuthorization,
  Timestamps,
  EntityCoreOwnership,
  EntityCoreType,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionFilter,
  SharedFilter,
  PaginationFilter,
  IdFilter,
} from '@/api/entitycore/types/shared/request';

export interface CircuitBase {
  name: string;
  description: string;
  number_neurons: number;
  number_synapses: number;
  number_connections: number;
}

export interface ICircuit
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    CircuitBase,
    Timestamps,
    EntityCoreOwnership,
    EntityCoreType,
    EntityCoreBaseAsset {}

export interface ICircuitFilter
  extends IdFilter,
    BrainRegionFilter,
    SharedFilter,
    PaginationFilter {}
