import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { isDetailRow } from './detail-rows';

import type { CellClassParams, ColDef, ValueFormatterParams } from 'ag-grid-community';
import type { ReactNode } from 'react';

/**
 * Placeholder shown when a cell has no value. Duplicates the glyph in
 * `bindings/entitycore/columns/catalog.ts` so the renderer ring need not depend on an
 * entitycore binding, which would drag react-query into every `SimpleGrid` consumer.
 */
export const EMPTY_PLACEHOLDER = '—';

export const EMPTY_PLACEHOLDER_CLASS = 'text-gray-300';

/**
 * Columns left blank rather than given the placeholder. Ideally a per-column
 * `blankWhenEmpty` opt-out on `IColumnModel` rather than an id list here.
 */
export const DELIBERATELY_BLANK_COLUMN_IDS: ReadonlySet<string> = new Set<string>([
  EntityCoreFields.CircuitSubCircuit,
]);

/** Absent, blank string or empty collection. `0` and `false` are real values, never empty. */
export function isEmptyCellValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** The placeholder as a styled node. */
export function EmptyCell(): ReactNode {
  return <span className={EMPTY_PLACEHOLDER_CLASS}>{EMPTY_PLACEHOLDER}</span>;
}

/** Render a raw cell value as text, substituting {@link EmptyCell} when it is empty. */
export function renderCellValue(value: unknown): ReactNode {
  return isEmptyCellValue(value) ? <EmptyCell /> : String(value);
}

/**
 * Make a plain-value column print the placeholder instead of nothing when empty. Only
 * for columns the grid renders itself; a `cellRenderer` owns its own empty state.
 * Display-only — `valueFormatter` leaves sorting, filtering and the query untouched.
 */
export function withEmptyPlaceholder<Row>(colDef: ColDef<Row>): ColDef<Row> {
  const isEmptyDataCell = (p: { data?: unknown; value?: unknown }): boolean =>
    !isDetailRow(p.data) && isEmptyCellValue(p.value);

  colDef.valueFormatter = (p: ValueFormatterParams<Row>) => {
    if (isDetailRow(p.data)) return '';
    return isEmptyCellValue(p.value) ? EMPTY_PLACEHOLDER : String(p.value);
  };
  colDef.cellClassRules = {
    ...colDef.cellClassRules,
    [EMPTY_PLACEHOLDER_CLASS]: (p: CellClassParams<Row>) => isEmptyDataCell(p),
  };
  return colDef;
}

/**
 * True when a column's empty cells stay blank: it has its own cell renderer, hosts the
 * expand chevron, or is one of {@link DELIBERATELY_BLANK_COLUMN_IDS}.
 */
export function keepsBlankWhenEmpty(
  column: { id: string; cellRenderer?: string },
  hostColumnId?: string
): boolean {
  return (
    Boolean(column.cellRenderer) ||
    column.id === hostColumnId ||
    DELIBERATELY_BLANK_COLUMN_IDS.has(column.id)
  );
}
