import { RiArrowDownSLine, RiArrowRightSLine } from '@remixicon/react';

import { isDetailRow } from './detail-rows';
import { useGridState } from './use-grid-state';

import type { CustomCellRendererProps } from 'ag-grid-react';
import type { AgGridContext } from './ag-context';

/**
 * Expand/collapse chevron for rows with detail content. Dispatches
 * `toggleExpanded`; the renderer reacts by (de)interleaving the synthetic
 * full-width detail row.
 */
export function AgExpandCell(props: CustomCellRendererProps) {
  const ctx = props.context as AgGridContext;
  const state = useGridState(ctx.controller);
  const row = props.data;

  if (row == null || isDetailRow(row)) return null;
  if (ctx.detail && !ctx.detail.provider.canExpand(row)) return null;

  const rowId = ctx.controller.schema.getRowId(row);
  const expanded = state.expanded.includes(rowId);

  return (
    <button
      type="button"
      aria-label={expanded ? 'Collapse row' : 'Expand row'}
      aria-expanded={expanded}
      className="flex h-full w-full items-center justify-center text-gray-500 hover:text-primary-7"
      onClick={(e) => {
        e.stopPropagation();
        ctx.controller.store.dispatch({ type: 'toggleExpanded', id: rowId });
      }}
    >
      {expanded ? <RiArrowDownSLine size={16} /> : <RiArrowRightSLine size={16} />}
    </button>
  );
}
