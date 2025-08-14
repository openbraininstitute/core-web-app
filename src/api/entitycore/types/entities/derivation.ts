import type { EntityCoreIdentifiable, EntityCoreType } from '@/api/entitycore/types/shared/global';
import type {
  EntityCoreTypeFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

export interface IDerivationBase extends EntityCoreIdentifiable, EntityCoreType {}
export interface IDerivationFilter extends PaginationFilter, SharedFilter, EntityCoreTypeFilter {}

export const DerivationType = {
  /**
   * Indicates that the entity was derived by extracting a set of nodes from a circuit.
   */
  circuit_extraction: 'circuit_extraction',

  /**
   * Indicates that the entity was derived by rewiring the connectivity of a circuit.
   */
  circuit_rewiring: 'circuit_rewiring',
} as const;

export type TDerivationType = (typeof DerivationType)[keyof typeof DerivationType];
