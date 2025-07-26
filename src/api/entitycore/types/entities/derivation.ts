import type { EntityCoreIdentifiable, EntityCoreType } from '@/api/entitycore/types/shared/global';
import type {
  EntityCoreTypeFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

export interface IDerivationBase extends EntityCoreIdentifiable, EntityCoreType {}
export interface IDerivationFilter extends PaginationFilter, SharedFilter, EntityCoreTypeFilter {}
