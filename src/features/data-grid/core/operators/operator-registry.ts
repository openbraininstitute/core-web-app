import type { FilterValueKind } from '../domain/filter-model';

/** How an operator is presented/edited in the filter UI. */
export type OperatorUiKind = 'text' | 'number' | 'range' | 'dateRange' | 'set' | 'boolean';

/**
 * When an operator's editor commits its value to the grid:
 * - `apply` — edits stay local until the Apply button (nothing refetches meanwhile).
 * - `immediate` — every change commits (debounced for typed inputs).
 * Configured per operator (i.e. per filter type); the default when unset is `apply`.
 */
export type FilterCommitMode = 'immediate' | 'apply';

/** Default commit behavior for any operator that doesn't declare one. */
export const DEFAULT_FILTER_COMMIT_MODE: FilterCommitMode = 'apply';

export interface OperatorDef {
  id: string;
  label: string;
  uiKind: OperatorUiKind;
  /** the FilterValue kind this operator edits */
  valueKind: FilterValueKind;
  /** when the editor commits (default {@link DEFAULT_FILTER_COMMIT_MODE} = `apply`). */
  commitMode?: FilterCommitMode;
}

/**
 * Catalog of available operators (Registry pattern). The core only knows operators
 * abstractly (id/label/uiKind); transport-specific serialization lives in a binding.
 */
export class OperatorRegistry {
  private readonly map = new Map<string, OperatorDef>();

  register(def: OperatorDef): this {
    this.map.set(def.id, def);
    return this;
  }

  registerMany(defs: Iterable<OperatorDef>): this {
    for (const def of defs) this.register(def);
    return this;
  }

  get(id: string): OperatorDef {
    const def = this.map.get(id);
    if (!def) throw new Error(`[data-grid] unknown operator: "${id}"`);
    return def;
  }

  tryGet(id: string): OperatorDef | undefined {
    return this.map.get(id);
  }

  has(id: string): boolean {
    return this.map.has(id);
  }

  list(): OperatorDef[] {
    return [...this.map.values()];
  }
}
