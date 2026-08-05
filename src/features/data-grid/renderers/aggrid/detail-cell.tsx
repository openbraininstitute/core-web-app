import { DetailRowHost } from '@/features/data-grid/react';
import { useGridState } from '@/features/data-grid/react/use-grid-state';
import { isDetailRow } from '@/features/data-grid/renderers/aggrid/detail-rows';

import type { CustomCellRendererProps } from 'ag-grid-react';
import type { IAgGridContext } from '@/features/data-grid/renderers/aggrid/ag-context';

/** Fallback height for a detail row while its content is measuring itself. */
export const DEFAULT_DETAIL_MIN_HEIGHT = 160;

/**
 * Full-width cell for synthetic detail rows: mounts the {@link DetailRowHost}
 * (provider fetch + renderer) and forwards its measured content height to the AG
 * Grid row node so dynamic content — including nested grids — never clips.
 */
export function AgDetailCell(props: CustomCellRendererProps) {
  const ctx = props.context as IAgGridContext;
  const row = props.data;
  // live parent state, so the detail render can stay column-consistent
  const state = useGridState(ctx.controller);

  if (!ctx.detail || !isDetailRow(row)) return null;

  const minHeight = ctx.controller.schema.detail?.minHeight ?? DEFAULT_DETAIL_MIN_HEIGHT;

  // A full-width row starts under the pinned-left columns, so inset the content by their
  // total width to line it up with the data columns.
  const pinnedLeftWidth = (props.api.getAllDisplayedColumns?.() ?? [])
    .filter((c) => c.getPinned() === 'left')
    .reduce((sum, c) => sum + c.getActualWidth(), 0);

  return (
    <div
      className="h-full w-full overflow-auto border-b border-gray-100 bg-gray-50/50"
      style={{ paddingLeft: pinnedLeftWidth }}
    >
      <DetailRowHost
        row={row.forRow}
        rowId={row.forRowId}
        gridId={ctx.controller.schema.id}
        detail={ctx.detail}
        minHeight={minHeight}
        state={state}
        onHeight={(height) => {
          const target = Math.max(height, minHeight);
          if (props.node.rowHeight !== target) {
            props.node.setRowHeight(target);
            props.api.onRowHeightChanged();
          }
        }}
      />
    </div>
  );
}
