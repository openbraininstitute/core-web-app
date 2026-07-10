import { RiArrowDownSLine, RiArrowUpSLine, RiExpandUpDownLine } from '@remixicon/react';

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
 *
 * Sort affordance (sortable columns only): unsorted shows a muted
 * up/down chevron; ascending an up chevron; descending a down chevron.
 */
export function AgHeader(props: CustomHeaderProps) {
  const ctx = props.context as AgGridContext;
  const { columnId, unit, sortable } = props as CustomHeaderProps & HeaderParams;
  const state = useGridState(ctx.controller);
  const entry = state.sort.find((s) => s.columnId === columnId);
  const rank = entry ? state.sort.findIndex((s) => s.columnId === columnId) : -1;

  const onClick = (e: MouseEvent) => {
    if (!sortable) return;
    ctx.controller.store.dispatch({ type: 'toggleSort', columnId, allowMulti: e.shiftKey });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex h-full w-full items-center gap-1.5 text-left',
        sortable ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      <span className="truncate font-semibold text-primary-8">{props.displayName}</span>
      {unit ? <span className="text-xs font-normal text-gray-400">[{unit}]</span> : null}
      {sortable && (
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          {entry?.direction === 'asc' ? (
            <RiArrowUpSLine size={16} className="text-primary-6" />
          ) : entry?.direction === 'desc' ? (
            <RiArrowDownSLine size={16} className="text-primary-6" />
          ) : (
            <RiExpandUpDownLine
              size={14}
              className="text-gray-300 transition-colors group-hover:text-gray-400"
            />
          )}
          {/* multi-sort rank badge (2nd+ sort key) */}
          {rank > 0 && <span className="text-[10px] font-semibold text-primary-5">{rank + 1}</span>}
        </span>
      )}
    </button>
  );
}
