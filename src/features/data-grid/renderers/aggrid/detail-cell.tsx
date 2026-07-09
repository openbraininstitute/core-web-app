import { DetailRowHost } from '../../react';
import { isDetailRow } from './detail-rows';

import type { CustomCellRendererProps } from 'ag-grid-react';
import type { AgGridContext } from './ag-context';

/** Fallback height for a detail row while its content is measuring itself. */
export const DEFAULT_DETAIL_MIN_HEIGHT = 160;

/**
 * Full-width cell for synthetic detail rows: mounts the {@link DetailRowHost}
 * (provider fetch + renderer) and forwards its measured content height to the AG
 * Grid row node so dynamic content — including nested grids — never clips.
 */
export function AgDetailCell(props: CustomCellRendererProps) {
  const ctx = props.context as AgGridContext;
  const row = props.data;

  if (!ctx.detail || !isDetailRow(row)) return null;

  const minHeight = ctx.controller.schema.detail?.minHeight ?? DEFAULT_DETAIL_MIN_HEIGHT;

  return (
    <div className="h-full w-full overflow-auto border-b border-gray-100 bg-gray-50/50">
      <DetailRowHost
        row={row.forRow}
        rowId={row.forRowId}
        gridId={ctx.controller.schema.id}
        detail={ctx.detail}
        minHeight={minHeight}
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
