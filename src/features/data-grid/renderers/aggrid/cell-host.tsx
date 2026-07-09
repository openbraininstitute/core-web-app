import type { CustomCellRendererProps } from 'ag-grid-react';
import type { CellRendererProps } from '../../react';
import type { AgGridContext } from './ag-context';

interface CellHostParams {
  rendererKey?: string;
}

/**
 * AG Grid cell renderer that resolves a column's `cellRenderer` key against the
 * binding's {@link CellRendererRegistry}. This indirection is what keeps the core
 * free of React components.
 */
export function AgCellHost(props: CustomCellRendererProps) {
  const ctx = props.context as AgGridContext;
  const params = (props.colDef?.cellRendererParams ?? {}) as CellHostParams &
    Record<string, unknown>;

  if (params.rendererKey) {
    const Component = ctx.cellRenderers.get(params.rendererKey);
    if (Component) {
      const cellProps: CellRendererProps<unknown> = {
        row: props.data,
        value: props.value as CellRendererProps<unknown>['value'],
        rowIndex: props.node?.rowIndex ?? 0,
        params,
      };
      return <Component {...cellProps} />;
    }
  }

  return props.value == null ? null : String(props.value);
}
