import { RiFilter3Line } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import { useGridState } from '../use-grid-state';
import { summarizeFilter } from './summary';

import type { CustomFloatingFilterProps } from 'ag-grid-react';
import type { AgGridContext } from '../ag-context';

export interface GridFloatingFilterParams {
  columnId: string;
}

/**
 * Always-visible floating row cell. Shows the active filter summary and opens the
 * full editor popup on click (`showParentFilter`). Keeps the header clean while
 * surfacing current filters inline.
 */
export function GridFloatingFilter(props: CustomFloatingFilterProps) {
  const ctx = props.context as AgGridContext;
  const { columnId } = props as CustomFloatingFilterProps & GridFloatingFilterParams;
  const state = useGridState(ctx.controller);
  const entry = state.filters[columnId];
  const summary = entry ? summarizeFilter(entry) : '';
  const active = Boolean(summary);

  return (
    <button
      type="button"
      onClick={() => props.showParentFilter()}
      className={cn(
        'flex h-7 w-full items-center gap-1 rounded border px-1.5 text-left text-xs',
        active ? 'border-primary-4 bg-primary-0 text-primary-7' : 'border-gray-200 text-gray-400'
      )}
      title={summary || 'Filter'}
    >
      <RiFilter3Line size={13} className="shrink-0" />
      <span className="flex-1 truncate">{summary || 'Filter…'}</span>
    </button>
  );
}
