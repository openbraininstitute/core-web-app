import { AgCellHost } from './cell-host';
import { isDetailRow } from './detail-rows';
import { AgExpandCell } from './expand-cell';
import { GridFilter } from './filters/grid-filter';
import { GridFloatingFilter } from './filters/grid-floating-filter';
import { AgHeader } from './header';

import type { ColDef } from 'ag-grid-community';
import type { ResolvedColumn } from '../../core';

export const EXPAND_COL_ID = '__expand';

export interface BuildColDefsOptions {
  hidden: Set<string>;
  /** user-resized widths (take precedence over the schema's width spec) */
  columnWidths: Record<string, number>;
  /** prepend the expand-chevron column (grids with a detail runtime) */
  withExpandColumn?: boolean;
}

/** Fixed, non-interactive expander column shown when detail rows are enabled. */
function expandColDef<Row>(): ColDef<Row> {
  return {
    colId: EXPAND_COL_ID,
    headerName: '',
    width: 40,
    minWidth: 40,
    maxWidth: 40,
    resizable: false,
    sortable: false,
    suppressMovable: true,
    lockPosition: 'left',
    cellRenderer: AgExpandCell,
  };
}

/**
 * Maps the renderer-agnostic {@link ResolvedColumn} list to AG Grid `ColDef`s.
 * Sorting is delegated to the custom header (server-side), and filtering to the
 * custom filter components, so AG Grid's built-in sort/filter never run.
 */
export function buildColDefs<Row>(
  columns: Array<ResolvedColumn<Row>>,
  options: BuildColDefsOptions
): Array<ColDef<Row>> {
  const { hidden, columnWidths, withExpandColumn } = options;

  const defs = columns.map((c) => {
    const field = c.field ?? c.id;
    const getValue = c.getValue;
    const userWidth = columnWidths[c.id];

    const colDef: ColDef<Row> = {
      colId: c.id,
      headerName: c.header,
      hide: hidden.has(c.id),
      sortable: false,
      headerComponent: AgHeader,
      headerComponentParams: { columnId: c.id, unit: c.unit, sortable: !!c.sortable },
      width: userWidth ?? c.width?.width,
      minWidth: c.width?.minWidth,
      // a user-resized width must win over any flex sizing
      flex: userWidth != null ? undefined : c.width?.flex,
      resizable: c.width?.resizable ?? true,
      cellClass:
        c.align === 'right'
          ? 'ag-right-aligned-cell'
          : c.align === 'center'
            ? 'ag-center-aligned-cell'
            : undefined,
    };

    if (getValue) {
      colDef.valueGetter = (p) =>
        p.data && !isDetailRow(p.data) ? (getValue(p.data) ?? null) : null;
    } else {
      // `field` may be a dotted path; cast past AG Grid's keyof-based field type
      colDef.field = field as ColDef<Row>['field'];
    }

    if (c.cellRenderer) {
      colDef.cellRenderer = AgCellHost;
      colDef.cellRendererParams = { rendererKey: c.cellRenderer, ...c.cellRendererParams };
    }

    if (c.filterAvailable && c.filter) {
      colDef.filter = GridFilter;
      colDef.filterParams = {
        columnId: c.id,
        facetKey: c.filter.facetKey ?? c.filter.field ?? field,
        operatorIds: c.filter.operators,
        optionsSource: c.filter.options,
        description: c.filter.description,
      };
      colDef.floatingFilter = true;
      colDef.floatingFilterComponent = GridFloatingFilter;
      colDef.floatingFilterComponentParams = { columnId: c.id };
      colDef.suppressHeaderMenuButton = true;
    }

    return colDef;
  });

  return withExpandColumn ? [expandColDef<Row>(), ...defs] : defs;
}
