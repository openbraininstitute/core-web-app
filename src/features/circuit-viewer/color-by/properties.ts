import { startCase } from 'es-toolkit';

import type { ColumnMeta } from '@/features/circuit-nodes/types';
import type { ColorByProperty } from './types';

/** position columns are not meaningful color-by targets */
const HIDDEN = new Set(['x', 'y', 'z']);

/** turn a raw SONATA column name into a human label (e.g. `morph_class` → "Morph Class") */
export function labelForProperty(name: string): string {
  return startCase(name);
}

/**
 * build the labeled list of properties to offer in the dropdown, straight from
 * the circuit's SONATA H5 columns (the worker is the source of truth). column
 * order is preserved; only position columns are hidden
 */
export function buildColorByProperties(columns: ColumnMeta[] | undefined): ColorByProperty[] {
  if (!columns) return [];
  return columns
    .filter((c) => !HIDDEN.has(c.name))
    .map((c) => ({ name: c.name, kind: c.kind, label: labelForProperty(c.name) }));
}
