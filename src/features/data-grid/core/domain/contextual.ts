import type {
  IGridContext,
  TGridContextValue,
} from '@/features/data-grid/core/domain/grid-context';

/**
 * Context-aware presentation resolution: any schema facet (column availability,
 * order, default visibility, …) may vary with the runtime {@link IGridContext}.
 *
 * Three interchangeable authoring forms, in increasing power:
 * 1. a constant `T` — `available: true`
 * 2. a predicate `(ctx) => T` — imperative escape hatch
 * 3. a {@link IContextualSpec} via {@link byContext} — declarative rules
 */

/** `T` or a readonly list of `T` (list = OR semantics in a {@link TWhenClause}). */
export type TMatchable<T> = T | readonly T[];

/**
 * Declarative predicate over the context. Keys are AND-ed; a list value inside a
 * key is OR-ed; an omitted (or `undefined`) key does not constrain. Known context
 * keys get autocomplete; any additional {@link IGridContext.factors} key is also
 * matchable.
 */
export type TWhenClause = {
  dataType?: TMatchable<string>;
  section?: TMatchable<string>;
  scope?: TMatchable<string>;
  species?: TMatchable<string>;
} & { [factor: string]: TMatchable<TGridContextValue> | undefined };

/** One ordered rule: matches when `when` AND the optional `matches` predicate hold. */
export interface IContextRule<T> {
  when?: TWhenClause;
  /** imperative refinement evaluated only if `when` matched (escape hatch) */
  matches?: (ctx: IGridContext) => boolean;
  value: T;
}

/** Declarative contextual value: start at `default`, then later matching rules win. */
export interface IContextualSpec<T> {
  default?: T;
  rules?: Array<IContextRule<T>>;
}

/** A value that is constant, computed from context, or resolved from declarative rules. */
export type TContextualValue<T> = T | ((ctx: IGridContext) => T) | IContextualSpec<T>;

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
export function byContext<T>(spec: IContextualSpec<T>): TContextualValue<T> {
  return Object.defineProperty({ ...spec }, CONTEXTUAL_SPEC, {
    value: true,
    enumerable: false,
  }) as IContextualSpec<T>;
}

function isContextualSpec<T>(value: unknown): value is IContextualSpec<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<symbol, unknown>)[CONTEXTUAL_SPEC] === true
  );
}

/** Flatten known keys + factors into one scalar map (known keys take precedence). */
function flattenContext(ctx: IGridContext): Record<string, TGridContextValue | undefined> {
  return {
    ...ctx.factors,
    dataType: ctx.dataType,
    section: ctx.section,
    scope: ctx.scope,
    species: ctx.species,
  };
}

/** Evaluate a declarative {@link TWhenClause} against the context. */
export function whenMatches(when: TWhenClause | undefined, ctx: IGridContext): boolean {
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
export function matchesRule<T>(rule: IContextRule<T>, ctx: IGridContext): boolean {
  if (!whenMatches(rule.when, ctx)) return false;
  if (rule.matches && !rule.matches(ctx)) return false;
  return true;
}

/**
 * Resolve any {@link TContextualValue} form for the given context. For the
 * declarative form, resolution starts at `default` and the LAST matching rule wins
 * (so specific rules are placed after general ones).
 */
export function resolveContextual<T>(value: TContextualValue<T>, ctx: IGridContext): T {
  if (typeof value === 'function') {
    return (value as (c: IGridContext) => T)(ctx);
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
 * Layer an override contextual value on top of a base one, so a shared column catalog
 * default can be refined per schema. Both declarative → merged spec, override rules
 * last so they win. An override constant/function replaces the base outright.
 */
export function mergeContextual<T>(
  base: TContextualValue<T> | undefined,
  override: TContextualValue<T> | undefined
): TContextualValue<T> | undefined {
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
