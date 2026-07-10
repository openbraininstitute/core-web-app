import { RiCloseLine, RiEqualizer2Line } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import { useGridState } from '../use-grid-state';
import { summarizeFilter } from './summary';

import type { CustomFloatingFilterProps } from 'ag-grid-react';
import type { MouseEvent } from 'react';
import type { AgGridContext } from '../ag-context';

export interface GridFloatingFilterParams {
  columnId: string;
}

/**
 * Always-visible floating row cell — an Airbnb-style pill input. Shows the active
 * filter summary and opens the full editor popup on click (`showParentFilter`);
 * when active it exposes an inline clear affordance. Sits inset from the cell edges
 * (`px-1.5 py-1.5`) so it never touches the row borders.
 */
export function GridFloatingFilter(props: CustomFloatingFilterProps) {
  const ctx = props.context as AgGridContext;
  const { columnId } = props as CustomFloatingFilterProps & GridFloatingFilterParams;
  const state = useGridState(ctx.controller);
  const entry = state.filters[columnId];
  const summary = entry ? summarizeFilter(entry) : '';
  const active = Boolean(summary);

  const clear = (e: MouseEvent) => {
    e.stopPropagation();
    // the store drives both the summary and the refetch; AG's own filter flag is
    // suppressed on the colDef, so no parent-instance sync is needed
    ctx.controller.store.dispatch({ type: 'setFilter', columnId, entry: null });
  };

  return (
    <div
      className={cn(
        'flex h-full w-full items-center gap-1 px-1.5 py-1.5',
        // the pill wrapper carries the border/shadow so the two buttons read as one control
        '[&>*]:transition-all'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-full items-center gap-1.5 rounded-lg border bg-white pl-2.5 pr-1 text-[13px] transition-all duration-150',
          active
            ? 'border-primary-5 shadow-[0_1px_3px_rgba(22,104,220,0.18)]'
            : 'border-gray-200 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-gray-300 hover:shadow-[0_2px_6px_rgba(16,24,40,0.08)]'
        )}
      >
        <RiEqualizer2Line
          size={14}
          className={cn('shrink-0', active ? 'text-primary-6' : 'text-gray-400')}
        />
        <button
          type="button"
          onClick={() => props.showParentFilter()}
          title={summary || 'Filter'}
          className={cn(
            'flex-1 truncate py-1 text-left',
            active ? 'text-primary-8' : 'text-gray-400'
          )}
        >
          {summary || 'Filter'}
        </button>
        {active && (
          <button
            type="button"
            aria-label="Clear filter"
            onClick={clear}
            className="flex shrink-0 items-center rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <RiCloseLine size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
