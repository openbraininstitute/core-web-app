import { RiArrowDownSLine, RiArrowUpSLine } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import { useGridState } from './use-grid-state';

import type { CustomHeaderProps } from 'ag-grid-react';
import type { MouseEvent } from 'react';
import type { AgGridContext } from './ag-context';

interface HeaderParams {
  columnId: string;
  unit?: string;
  sortable?: boolean;
}

/**
 * Custom header. Sorting is server-side, so AG Grid's own sort is disabled
 * (`sortable: false` on the colDef) and clicks here dispatch `toggleSort` to the
 * store. The indicator reflects the store, not AG Grid. Shift-click adds a
 * secondary sort.
 */
export function AgHeader(props: CustomHeaderProps) {
  const ctx = props.context as AgGridContext;
  const { columnId, unit, sortable } = props as CustomHeaderProps & HeaderParams;
  const state = useGridState(ctx.controller);
  const entry = state.sort.find((s) => s.columnId === columnId);

  const onClick = (e: MouseEvent) => {
    if (!sortable) return;
    ctx.controller.store.dispatch({ type: 'toggleSort', columnId, allowMulti: e.shiftKey });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-full w-full items-center gap-1 text-left',
        sortable ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      <span className="truncate font-medium text-primary-8">{props.displayName}</span>
      {unit ? <span className="text-xs text-gray-400">[{unit}]</span> : null}
      {entry?.direction === 'asc' && <RiArrowUpSLine size={14} className="shrink-0" />}
      {entry?.direction === 'desc' && <RiArrowDownSLine size={14} className="shrink-0" />}
    </button>
  );
}
