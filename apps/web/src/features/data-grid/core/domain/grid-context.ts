/** Scalar factor values the contextual resolver can match on. */
export type TGridContextValue = string | number | boolean;

/**
 * Runtime inputs used to resolve contextual schema rules (column availability,
 * order, filter availability, selection/detail enablement, …). Known keys are typed;
 * `factors` is an open bag of host-defined dimensions. Kept flat and scalar so `when`
 * matching and query-key memoisation stay cheap.
 */
export interface IGridContext {
  dataType: string;
  section?: string;
  scope?: string;
  /** species identity (`all` or a hierarchy id) when the host is species-aware */
  species?: string;
  /** additional, host-defined factors matchable by contextual rules */
  factors?: Readonly<Record<string, TGridContextValue>>;
}

export {
  byContext,
  matchesRule,
  mergeContextual,
  resolveContextual,
  whenMatches,
} from './contextual';

// Re-exported for convenience; the engine itself lives in ./contextual.
export type {
  IContextRule,
  IContextualSpec,
  TContextualValue,
  TMatchable,
  TWhenClause,
} from './contextual';
