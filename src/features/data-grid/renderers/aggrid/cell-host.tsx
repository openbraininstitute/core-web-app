import { renderCellValue } from '@/features/data-grid/renderers/aggrid/empty-cell';

import type { CustomCellRendererProps } from 'ag-grid-react';
import type { ICellRendererProps } from '@/features/data-grid/react';
import type { IAgGridContext } from '@/features/data-grid/renderers/aggrid/ag-context';

interface CellHostParams {
  rendererKey?: string;
}

/**
 * AG Grid cell renderer that resolves a column's `cellRenderer` key against the
 * binding's {@link CellRendererRegistry}. This indirection is what keeps the core
 * free of React components.
 */
export function AgCellHost(props: CustomCellRendererProps) {
  const ctx = props.context as IAgGridContext;
  const params = (props.colDef?.cellRendererParams ?? {}) as CellHostParams &
    Record<string, unknown>;

  if (params.rendererKey) {
    const Component = ctx.cellRenderers.get(params.rendererKey);
    if (Component) {
      const cellProps: ICellRendererProps<unknown> = {
        row: props.data,
        value: props.value as ICellRendererProps<unknown>['value'],
        rowIndex: props.node?.rowIndex ?? 0,
        params,
      };
      return <Component {...cellProps} />;
    }
  }

  // No (or unresolved) renderer key: print the plain value, or the shared
  // placeholder when it is missing/empty — never an empty cell.
  return renderCellValue(props.value);
}
