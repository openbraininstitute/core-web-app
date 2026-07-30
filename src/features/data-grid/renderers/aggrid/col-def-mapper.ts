import { AgCellHost } from './cell-host';
import { isDetailRow } from './detail-rows';
import { AgExpandCell } from './expand-cell';
import { AgExpandHostCell } from './expand-host-cell';
import { AgHeader } from './header';

import type { ColDef } from 'ag-grid-community';
import type { ResolvedColumn } from '../../core';
import type { ExpandColumnConfig } from '../../react';

export const EXPAND_COL_ID = '__expand';

export interface BuildColDefsOptions {
  hidden: Set<string>;
  /** user-resized widths (take precedence over the schema's width spec) */
  columnWidths: Record<string, number>;
  /** prepend the expand-chevron column (grids with a detail runtime) */
  withExpandColumn?: boolean;
  /**
   * optional placement of the expander. When `columnId` matches a data column the
   * chevron hosts inside that cell and no leading column is prepended; otherwise
   * (default) the fixed leading `__expand` column is used.
   */
  expandColumn?: ExpandColumnConfig;
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
  const { hidden, columnWidths, withExpandColumn, expandColumn } = options;

  // Host the expander inside a named column only when a detail runtime exists AND a
  // matching column id was supplied; otherwise fall back to the leading column.
  const hostColumnId =
    withExpandColumn && expandColumn?.columnId
      ? columns.some((c) => c.id === expandColumn.columnId)
        ? expandColumn.columnId
        : undefined
      : undefined;

  const defs = columns.map((c) => {
    const field = c.field ?? c.id;
    const getValue = c.getValue;
    const userWidth = columnWidths[c.id];

    // the whole filter UI now lives in the custom header (round icon-button +
    // popover), so there is no AG floating-filter row — the header just needs the
    // column's filter config to render it.
    const filterParams =
      c.filterAvailable && c.filter
        ? {
            facetKey: c.filter.facetKey ?? c.filter.field ?? field,
            operatorIds: c.filter.operators,
            optionsSource: c.filter.options,
            description: c.filter.description,
          }
        : undefined;

    const colDef: ColDef<Row> = {
      colId: c.id,
      headerName: c.header,
      hide: hidden.has(c.id),
      sortable: false,
      headerComponent: AgHeader,
      headerComponentParams: {
        columnId: c.id,
        unit: c.unit,
        sortable: !!c.sortable,
        filter: filterParams,
      },
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

    if (c.id === hostColumnId) {
      // Host the expander inside this column's cell; the host renderer also draws
      // the column's normal content (via `rendererKey` or the plain value).
      colDef.cellRenderer = AgExpandHostCell;
      colDef.cellRendererParams = {
        rendererKey: c.cellRenderer,
        ...c.cellRendererParams,
        expandAlign: expandColumn?.align ?? 'right',
        renderExpander: expandColumn?.renderExpander,
      };
    } else if (c.cellRenderer) {
      colDef.cellRenderer = AgCellHost;
      colDef.cellRendererParams = { rendererKey: c.cellRenderer, ...c.cellRendererParams };
    }

    if (filterParams) {
      colDef.suppressHeaderMenuButton = true;
    }

    return colDef;
  });

  // Prepend the fixed leading expander only when the expander is NOT hosted inside
  // a data column — preserving the historical default for every existing entity.
  return withExpandColumn && !hostColumnId ? [expandColDef<Row>(), ...defs] : defs;
}
