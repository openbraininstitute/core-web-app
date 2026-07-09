/**
 * Keys used to resolve contextual schema rules (column visibility, filter
 * availability, selection/detail enablement). Kept small and string-based so the
 * core never depends on app-specific enums.
 */
export interface GridContext {
  dataType: string;
  section?: string;
  scope?: string;
  /** species identity (`all` or a hierarchy id) when the host is species-aware */
  species?: string;
}

/** A value that may be constant or computed from the current {@link GridContext}. */
export type ContextualValue<T> = T | ((ctx: GridContext) => T);

export function resolveContextual<T>(value: ContextualValue<T>, ctx: GridContext): T {
  return typeof value === 'function' ? (value as (c: GridContext) => T)(ctx) : value;
}
