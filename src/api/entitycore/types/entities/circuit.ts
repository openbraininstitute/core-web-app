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
} from '@/api/entitycore/types/shared/request';

export interface CircuitBase {
  name: string;
  description: string;
}

export interface ICircuit
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    CircuitBase,
    Timestamps,
    EntityCoreOwnership,
    EntityCoreType,
    EntityCoreBaseAsset {}

export interface ICircuitFilter extends BrainRegionFilter, SharedFilter, PaginationFilter {}
