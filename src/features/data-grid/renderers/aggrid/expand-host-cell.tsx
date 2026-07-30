import { isDetailRow } from './detail-rows';
import { ExpandToggleButton } from './expand-cell';

import type { CustomCellRendererProps } from 'ag-grid-react';
import type { ReactNode } from 'react';
import type { CellRendererProps } from '../../react';
import type { AgGridContext } from './ag-context';

/** Params threaded onto the host column by the col-def mapper. */
export interface ExpandHostCellParams {
  /** cell-renderer registry key for the column's normal content (optional). */
  rendererKey?: string;
  /** within-cell alignment of the expander (default: 'right'). */
  expandAlign?: 'left' | 'right';
  /** custom expander glyph, forwarded from the ExpandColumnConfig. */
  renderExpander?: (open: boolean) => ReactNode;
  [key: string]: unknown;
}

/**
 * Hosts the expand toggle INSIDE a data column's cell (see {@link ExpandColumnConfig}).
 * Renders the column's normal content — via the cell-renderer registry when a
 * `rendererKey` is set, else the plain value — and places the shared
 * {@link ExpandToggleButton} at the cell's leading/trailing edge, vertically centred.
 */
export function AgExpandHostCell(props: CustomCellRendererProps) {
  const ctx = props.context as AgGridContext;
  const params = (props.colDef?.cellRendererParams ?? {}) as ExpandHostCellParams;
  const row = props.data;

  if (row == null || isDetailRow(row)) return null;

  const align = params.expandAlign ?? 'right';

  let content: ReactNode = null;
  if (params.rendererKey) {
    const Component = ctx.cellRenderers.get(params.rendererKey);
    if (Component) {
      const cellProps: CellRendererProps<unknown> = {
        row: props.data,
        value: props.value as CellRendererProps<unknown>['value'],
        rowIndex: props.node?.rowIndex ?? 0,
        params,
      };
      content = <Component {...cellProps} />;
    } else {
      content = props.value == null ? null : String(props.value);
    }
  } else {
    content = props.value == null ? null : String(props.value);
  }

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
      {align === 'left' && toggle}
      <span className="min-w-0 flex-1">{content}</span>
      {align === 'right' && toggle}
    </div>
  );
}
