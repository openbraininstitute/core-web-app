import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { isDetailRow } from './detail-rows';

import type { CellClassParams, ColDef, ValueFormatterParams } from 'ag-grid-community';
import type { ReactNode } from 'react';

/**
 * Shared placeholder shown when a cell has no value (em dash).
 *
 * Same glyph as `EMPTY_PLACEHOLDER` in
 * `bindings/entitycore/columns/catalog.ts`; declared here as well so the renderer
 * ring can substitute it WITHOUT depending on an entitycore binding (which would
 * drag react-query + the api layer into every `SimpleGrid` consumer). The catalog
 * copy should eventually re-export this one so there is a single source of truth.
 */
export const EMPTY_PLACEHOLDER = '—';

/** The one styling the placeholder gets, in every cell that renders it. */
export const EMPTY_PLACEHOLDER_CLASS = 'text-gray-300';

/**
 * Columns that are deliberately blank when they have no value, so the placeholder
 * must NOT be substituted. The circuit "Subcircuits" column is a subcircuit COUNT
 * that reads as empty for a leaf circuit (and for every row in the flat view) — an
 * em dash there would be noise, not information.
 *
 * Ideally this would be a per-column opt-out (`blankWhenEmpty` on `IColumnModel`)
 * declared by the schema rather than an id list here.
 */
export const DELIBERATELY_BLANK_COLUMN_IDS: ReadonlySet<string> = new Set<string>([
  EntityCoreFields.CircuitSubCircuit,
]);

/**
 * A cell value counts as empty when it is absent (`null` / `undefined`), a blank
 * string (the `?? ''` convention most `getValue`s use for "missing"), or an empty
 * collection. `0` and `false` are REAL values and never empty.
 */
export function isEmptyCellValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** The placeholder as a styled node — the shared look for every empty cell. */
export function EmptyCell(): ReactNode {
  return <span className={EMPTY_PLACEHOLDER_CLASS}>{EMPTY_PLACEHOLDER}</span>;
}

/**
 * Render a raw cell value as text, substituting {@link EmptyCell} when it is empty.
 * Used by the cell hosts that fall back to printing the plain value.
 */
export function renderCellValue(value: unknown): ReactNode {
  return isEmptyCellValue(value) ? <EmptyCell /> : String(value);
}

/**
 * Make a plain-value column print the placeholder (greyed) instead of nothing when
 * its value is empty. Only for columns the GRID renders itself — a column with a
 * `cellRenderer` owns its own empty state, and the expander-host column is
 * deliberately blank.
 *
 * Display-only: `valueFormatter` never changes the underlying value, so sorting,
 * filtering and the serialized query are untouched. Synthetic detail rows are
 * skipped (their cells are not real data cells).
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
 * True when a column's empty cells must stay blank: it has its own cell renderer,
 * it hosts the expand chevron, or it is one of the {@link DELIBERATELY_BLANK_COLUMN_IDS}.
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
