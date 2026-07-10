import type { GridContext, GridContextValue } from './grid-context';

/**
 * Context-aware presentation resolution.
 *
 * A {@link ContextualValue} lets any schema facet (column availability, order,
 * default visibility, filter availability, …) vary with the runtime
 * {@link GridContext} — the successor to the legacy `matchesFieldApiWhen` /
 * `resolveContextualValue` engine, generalised so it is:
 *
 * - **extensible** — `when` matches ANY context key, including forward-compatible
 *   {@link GridContext.factors} (role, feature flag, view variant, device…), so a
 *   new factor needs no change here: add it to the context and rules can match it.
 * - **declarative & inspectable** — the rule form is plain data (serialisable,
 *   debuggable, diffable), not an opaque closure.
 * - **composable** — {@link mergeContextual} layers a per-use override on a shared
 *   catalog default, so the column catalog can ship sensible defaults that a
 *   specific entity schema refines.
 * - **efficient** — resolution is a linear scan of a column's own rules; no
 *   allocation beyond the flattened context, and callers resolve once per context.
 *
 * Three authoring forms, in increasing power (all interchangeable):
 * 1. a constant `T` — `available: true`
 * 2. a predicate `(ctx) => T` — imperative escape hatch
 * 3. a {@link ContextualSpec} via {@link byContext} — declarative rules
 */

/** `T` or a readonly list of `T` (list = OR semantics in a {@link WhenClause}). */
export type Matchable<T> = T | readonly T[];

/**
 * Declarative predicate over the context. Keys are AND-ed; a list value inside a
 * key is OR-ed; an omitted (or `undefined`) key does not constrain. Known context
 * keys get autocomplete; any additional {@link GridContext.factors} key is also
 * matchable.
 */
export type WhenClause = {
  dataType?: Matchable<string>;
  section?: Matchable<string>;
  scope?: Matchable<string>;
  species?: Matchable<string>;
} & { [factor: string]: Matchable<GridContextValue> | undefined };

/** One ordered rule: matches when `when` AND the optional `matches` predicate hold. */
export interface ContextRule<T> {
  when?: WhenClause;
  /** imperative refinement evaluated only if `when` matched (escape hatch) */
  matches?: (ctx: GridContext) => boolean;
  value: T;
}

/** Declarative contextual value: start at `default`, then later matching rules win. */
export interface ContextualSpec<T> {
  default?: T;
  rules?: Array<ContextRule<T>>;
}

/** A value that is constant, computed from context, or resolved from declarative rules. */
export type ContextualValue<T> = T | ((ctx: GridContext) => T) | ContextualSpec<T>;

const CONTEXTUAL_SPEC = Symbol('data-grid.contextual-spec');

/**
 * Tag a declarative spec so it is distinguishable from a plain object value of `T`.
 * Author contextual rules through this builder:
 *
 * ```ts
 * available: byContext({
 *   default: false,
 *   rules: [
 *     { when: { section: 'data' }, value: true },
 *     { when: { section: 'data', scope: 'public' }, value: false }, // last match wins
 *   ],
 * })
 * ```
 */
export function byContext<T>(spec: ContextualSpec<T>): ContextualValue<T> {
  return Object.defineProperty({ ...spec }, CONTEXTUAL_SPEC, {
    value: true,
    enumerable: false,
  }) as ContextualSpec<T>;
}

function isContextualSpec<T>(value: unknown): value is ContextualSpec<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<symbol, unknown>)[CONTEXTUAL_SPEC] === true
  );
}

/** Flatten known keys + factors into one scalar map (known keys take precedence). */
function flattenContext(ctx: GridContext): Record<string, GridContextValue | undefined> {
  return {
    ...ctx.factors,
    dataType: ctx.dataType,
    section: ctx.section,
    scope: ctx.scope,
    species: ctx.species,
  };
}

/** Evaluate a declarative {@link WhenClause} against the context. */
export function whenMatches(when: WhenClause | undefined, ctx: GridContext): boolean {
  if (!when) return true;
  const flat = flattenContext(ctx);
  for (const key of Object.keys(when)) {
    const expected = when[key];
    if (expected === undefined) continue;
    const actual = flat[key];
    if (Array.isArray(expected)) {
      if (actual === undefined || !expected.includes(actual)) return false;
    } else if (expected !== actual) {
      return false;
    }
  }
  return true;
}

/** A rule matches when its `when` clause AND its imperative `matches` predicate hold. */
export function matchesRule<T>(rule: ContextRule<T>, ctx: GridContext): boolean {
  if (!whenMatches(rule.when, ctx)) return false;
  if (rule.matches && !rule.matches(ctx)) return false;
  return true;
}

/**
 * Resolve any {@link ContextualValue} form for the given context. For the
 * declarative form, resolution starts at `default` and the LAST matching rule wins
 * (so specific rules are placed after general ones).
 */
export function resolveContextual<T>(value: ContextualValue<T>, ctx: GridContext): T {
  if (typeof value === 'function') {
    return (value as (c: GridContext) => T)(ctx);
  }
  if (isContextualSpec<T>(value)) {
    let resolved = value.default as T;
    if (value.rules) {
      for (const rule of value.rules) {
        if (matchesRule(rule, ctx)) resolved = rule.value;
      }
    }
    return resolved;
  }
  return value;
}

/**
 * Layer an override contextual value on top of a base one. Used so a shared column
 * catalog can declare a default rule set that a specific entity schema extends:
 * the override's rules are evaluated AFTER the base's, so they win on conflict,
 * while the base's rules still apply where the override is silent.
 *
 * - both declarative → merged spec (base rules then override rules; override
 *   `default` wins if set)
 * - override constant/function → replaces the base outright (explicit intent)
 */
export function mergeContextual<T>(
  base: ContextualValue<T> | undefined,
  override: ContextualValue<T> | undefined
): ContextualValue<T> | undefined {
  if (override === undefined) return base;
  if (base === undefined) return override;
  if (isContextualSpec<T>(base) && isContextualSpec<T>(override)) {
    return byContext<T>({
      default: override.default ?? base.default,
      rules: [...(base.rules ?? []), ...(override.rules ?? [])],
    });
  }
  return override;
}
