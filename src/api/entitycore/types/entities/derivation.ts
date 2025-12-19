import type { EntityCoreIdentifiable, EntityCoreType } from '@/api/entitycore/types/shared/global';
import type {
  EntityCoreTypeFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

/**
 * Represents the type of derivation relationship between two entities.
 *
 * - circuit_extraction: Indicates that the entity was derived by extracting a set of nodes from
 *   a circuit.
 * - circuit_rewiring: Indicates that the entity was derived by rewiring the connectivity of
 *   a circuit.
 * - unspecified: Indicates a derivation that does not require a specific type.
 */
export const DerivationType = {
  CircuitExtraction: {
    key: 'circuit_extraction',
    label: 'Circuit extraction',
  },
  CircuitRewiring: {
    key: 'circuit_rewiring',
    label: 'Circuit rewiring',
  },
  Unspecified: {
    key: 'unspecified',
    label: 'Unspecified',
  },
} as const;

export const DerivationTypeDictionary = Object.fromEntries(
  Object.entries(DerivationType).map(([name, value]) => [name, value.key]),
) as {
  [K in keyof typeof DerivationType]: (typeof DerivationType)[K]['key'];
};

export type TDerivationType =
  (typeof DerivationTypeDictionary)[keyof typeof DerivationTypeDictionary];

export interface IDerivationBase extends EntityCoreIdentifiable, EntityCoreType {}
export interface IDerivationFilter extends PaginationFilter, SharedFilter, EntityCoreTypeFilter {
  derivation_type: TDerivationType;
}
