import type { FilterValueKind } from '../domain/filter-model';

/** How an operator is presented/edited in the filter UI. */
export type OperatorUiKind = 'text' | 'number' | 'range' | 'dateRange' | 'set' | 'boolean';

export interface OperatorDef {
  id: string;
  label: string;
  uiKind: OperatorUiKind;
  /** the FilterValue kind this operator edits */
  valueKind: FilterValueKind;
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
