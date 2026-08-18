import { Align } from '@/features/data-grid/core';
import { renderKeyedCell } from '@/features/data-grid/renderers/aggrid/cell-host';
import { isDetailRow } from '@/features/data-grid/renderers/aggrid/detail-rows';
import { ExpandToggleButton } from '@/features/data-grid/renderers/aggrid/expand-cell';

import type { CustomCellRendererProps } from 'ag-grid-react';
import type { ReactNode } from 'react';
import type { IAgGridContext } from '@/features/data-grid/renderers/aggrid/ag-context';

/** Params threaded onto the host column by the col-def mapper. */
export interface IExpandHostCellParams {
  /** cell-renderer registry key for the column's normal content (optional). */
  rendererKey?: string;
  /** within-cell alignment of the expander (default: 'right'). */
  expandAlign?: 'left' | 'right';
  /** custom expander glyph, forwarded from the IExpandColumnConfig. */
  renderExpander?: (open: boolean) => ReactNode;
  [key: string]: unknown;
}

/**
 * Hosts the expand toggle INSIDE a data column's cell (see {@link IExpandColumnConfig}).
 * Renders the column's normal content — via the cell-renderer registry when a
 * `rendererKey` is set, else the plain value — and places the shared
 * {@link ExpandToggleButton} at the cell's leading/trailing edge, vertically centred.
 */
export function AgExpandHostCell(props: CustomCellRendererProps) {
  const ctx = props.context as IAgGridContext;
  const params = (props.colDef?.cellRendererParams ?? {}) as IExpandHostCellParams;
  const row = props.data;

  if (row == null || isDetailRow(row)) return null;

  const align = params.expandAlign ?? 'right';

  const keyed = renderKeyedCell(ctx.cellRenderers, params.rendererKey, {
    row: props.data,
    value: props.value,
    rowIndex: props.node?.rowIndex ?? 0,
    params,
  });
  const content: ReactNode = keyed ?? (props.value == null ? null : String(props.value));

  const toggle = (
    <span className="shrink-0">
      <ExpandToggleButton
        controller={ctx.controller}
        detail={ctx.detail}
        row={row}
        renderGlyph={params.renderExpander}
        fill={false}
      />
    </span>
  );

  return (
    <div className="flex h-full w-full items-center gap-1">
      {align === Align.Left && toggle}
      <span className="min-w-0 flex-1">{content}</span>
      {align === Align.Right && toggle}
    </div>
  );
}
