/** Scalar factor values the contextual resolver can match on. */
export type GridContextValue = string | number | boolean;

/**
 * Runtime inputs used to resolve contextual schema rules (column availability,
 * order, filter availability, selection/detail enablement, …).
 *
 * Known keys are typed; `factors` is an open, forward-compatible bag so a host can
 * supply ANY additional dimension (user role, feature flag, view variant, device,
 * …) that rules can match on WITHOUT touching the core. Kept flat and scalar so
 * `when` matching and query-key memoisation stay cheap.
 */
export interface GridContext {
  dataType: string;
  section?: string;
  scope?: string;
  /** species identity (`all` or a hierarchy id) when the host is species-aware */
  species?: string;
  /** additional, host-defined factors matchable by contextual rules */
  factors?: Readonly<Record<string, GridContextValue>>;
}

export {
  byContext,
  matchesRule,
  mergeContextual,
  resolveContextual,
  whenMatches,
} from './contextual';

// Re-exported so existing `./grid-context` importers keep working; the engine
// itself lives in ./contextual.
export type {
  ContextRule,
  ContextualSpec,
  ContextualValue,
  Matchable,
  WhenClause,
} from './contextual';
