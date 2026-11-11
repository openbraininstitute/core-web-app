import { renderCellValue } from '@/features/data-grid/renderers/aggrid/empty-cell';

import type { CustomCellRendererProps } from 'ag-grid-react';
import type { ReactNode } from 'react';
import type { CellRendererRegistry, ICellRendererProps } from '@/features/data-grid/react';
import type { IAgGridContext } from '@/features/data-grid/renderers/aggrid/ag-context';

interface CellHostParams {
  rendererKey?: string;
}

/**
 * Render a column's `cellRenderer` key through the registry, or `undefined` when it is
 * absent or unregistered, leaving the fallback to each host.
 */
export function renderKeyedCell(
  registry: CellRendererRegistry,
  rendererKey: string | undefined,
  cell: { row: unknown; value: unknown; rowIndex: number; params: Record<string, unknown> }
): ReactNode | undefined {
  if (!rendererKey) return undefined;
  const Component = registry.get(rendererKey);
  if (!Component) return undefined;

  const cellProps: ICellRendererProps<unknown> = {
    row: cell.row,
    value: cell.value as ICellRendererProps<unknown>['value'],
    rowIndex: cell.rowIndex,
    params: cell.params,
  };
  return <Component {...cellProps} />;
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

  const keyed = renderKeyedCell(ctx.cellRenderers, params.rendererKey, {
    row: props.data,
    value: props.value,
    rowIndex: props.node?.rowIndex ?? 0,
    params,
  });
  if (keyed !== undefined) return keyed;

  // No (or unresolved) renderer key: print the plain value, or the shared
  // placeholder when it is missing/empty — never an empty cell.
  return renderCellValue(props.value);
}
