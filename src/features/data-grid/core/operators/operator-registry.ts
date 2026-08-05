import type { TFilterValueKind } from '@/features/data-grid/core/domain/filter-model';

/** How an operator is presented/edited in the filter UI. */
export const OperatorUiKind = {
  Text: 'text',
  Number: 'number',
  Range: 'range',
  DateRange: 'dateRange',
  Set: 'set',
  Boolean: 'boolean',
} as const;

export type TOperatorUiKind = (typeof OperatorUiKind)[keyof typeof OperatorUiKind];

/**
 * When an operator's editor commits its value to the grid:
 * - `apply` — edits stay local until the Apply button (nothing refetches meanwhile).
 * - `immediate` — every change commits (debounced for typed inputs).
 * Configured per operator (i.e. per filter type); the default when unset is `apply`.
 */
export const FilterCommitMode = {
  Immediate: 'immediate',
  Apply: 'apply',
} as const;

export type TFilterCommitMode = (typeof FilterCommitMode)[keyof typeof FilterCommitMode];

/** Default commit behavior for any operator that doesn't declare one. */
export const DEFAULT_FILTER_COMMIT_MODE: TFilterCommitMode = FilterCommitMode.Apply;

export interface IOperatorDef {
  id: string;
  label: string;
  uiKind: TOperatorUiKind;
  /** the FilterValue kind this operator edits */
  valueKind: TFilterValueKind;
  /** when the editor commits (default {@link DEFAULT_FILTER_COMMIT_MODE} = `apply`). */
  commitMode?: TFilterCommitMode;
}

/**
 * Catalog of available operators (Registry pattern). The core only knows operators
 * abstractly (id/label/uiKind); transport-specific serialization lives in a binding.
 */
export class OperatorRegistry {
  private readonly map = new Map<string, IOperatorDef>();

  register(def: IOperatorDef): this {
    this.map.set(def.id, def);
    return this;
  }

  registerMany(defs: Iterable<IOperatorDef>): this {
    for (const def of defs) this.register(def);
    return this;
  }

  get(id: string): IOperatorDef {
    const def = this.map.get(id);
    if (!def) throw new Error(`[data-grid] unknown operator: "${id}"`);
    return def;
  }

  tryGet(id: string): IOperatorDef | undefined {
    return this.map.get(id);
  }

  has(id: string): boolean {
    return this.map.has(id);
  }

  list(): IOperatorDef[] {
    return [...this.map.values()];
  }
}
