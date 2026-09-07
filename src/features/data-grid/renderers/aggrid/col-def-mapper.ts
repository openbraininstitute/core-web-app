import { Align, resolveFilterTargets } from '@/features/data-grid/core';
import { AgCellHost } from '@/features/data-grid/renderers/aggrid/cell-host';
import { isDetailRow } from '@/features/data-grid/renderers/aggrid/detail-rows';
import {
  keepsBlankWhenEmpty,
  withEmptyPlaceholder,
} from '@/features/data-grid/renderers/aggrid/empty-cell';
import { AgExpandCell } from '@/features/data-grid/renderers/aggrid/expand-cell';
import { AgExpandHostCell } from '@/features/data-grid/renderers/aggrid/expand-host-cell';
import { AgHeader } from '@/features/data-grid/renderers/aggrid/header';

import type { ColDef } from 'ag-grid-community';
import type { IResolvedColumn } from '@/features/data-grid/core';
import type { IExpandColumnConfig } from '@/features/data-grid/react';

export const EXPAND_COL_ID = '__expand';

export interface IBuildColDefsOptions {
  hidden: Set<string>;
  /** user-resized widths (take precedence over the schema's width spec) */
  columnWidths: Record<string, number>;
  /** prepend the expand-chevron column (grids with a detail runtime) */
  withExpandColumn?: boolean;
  /** when `columnId` matches a data column the chevron hosts inside that cell instead */
  expandColumn?: IExpandColumnConfig;
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
 * Maps the renderer-agnostic {@link IResolvedColumn} list to AG Grid `ColDef`s.
 * Sorting is delegated to the custom header (server-side), and filtering to the
 * custom filter components, so AG Grid's built-in sort/filter never run.
 */
export function buildColDefs<Row>(
  columns: Array<IResolvedColumn<Row>>,
  options: IBuildColDefsOptions
): Array<ColDef<Row>> {
  const { hidden, columnWidths, withExpandColumn, expandColumn } = options;

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

    // the whole filter UI lives in the custom header, so there is no AG floating-filter
    // row — the header only needs the column's targets (a flat filter resolves to one)
    const targets = c.filterTargets ?? resolveFilterTargets(c);
    const filterParams = c.filterAvailable && targets.length > 0 ? { targets } : undefined;

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
      // position-pinned columns (`movable: false`) keep their declared slot — no drag handle
      suppressMovable: c.movable === false,
      // frozen against an edge; `lockPosition` keeps a drag from pulling it out
      pinned: c.pinned,
      lockPosition: c.pinned,
      cellClass:
        c.align === Align.Right
          ? 'ag-right-aligned-cell'
          : c.align === Align.Center
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

    if (!keepsBlankWhenEmpty(c, hostColumnId)) withEmptyPlaceholder(colDef);

    return colDef;
  });

  return withExpandColumn && !hostColumnId ? [expandColDef<Row>(), ...defs] : defs;
}
