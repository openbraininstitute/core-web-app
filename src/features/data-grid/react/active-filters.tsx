import { RiCloseLine, RiFilter3Line, RiRestartLine } from '@remixicon/react';
import { Popover } from 'antd';
import { useMemo } from 'react';

import { cn } from '@/utils/css-class';

import { summarizeFilter } from '../core';

import type { GridController, GridState } from '../core';

export interface ActiveFiltersButtonProps<Row> {
  controller: GridController<Row>;
  state: GridState;
  className?: string;
}

/**
 * Toolbar control listing the grid's ACTIVE filters. Renders only when at least one
 * filter is applied ("when the grid is filtered"), so it sits beside the column
 * chooser exactly like the header filter, but summarising every active column filter
 * in one place. Each row shows the column label + a value summary with a per-filter
 * reset; a global "reset all" sits at the bottom. Renderer-agnostic — reads/dispatches
 * only through the controller store, so it works for every grid type.
 */
export function ActiveFiltersButton<Row>({
  controller,
  state,
  className,
}: ActiveFiltersButtonProps<Row>) {
  const columns = useMemo(() => controller.resolvedColumns(), [controller]);
  const labelById = useMemo(
    () => new Map(columns.map((c) => [c.id, c.header] as const)),
    [columns]
  );

  // Only filters that actually narrow the grid (non-empty summary) are listed.
  const active = useMemo(
    () => Object.values(state.filters).filter((e) => summarizeFilter(e) !== ''),
    [state.filters]
  );

  if (active.length === 0) return null;

  const clearOne = (columnId: string) =>
    controller.store.dispatch({ type: 'setFilter', columnId, entry: null });
  const clearAll = () => controller.store.dispatch({ type: 'clearFilters' });

  const content = (
    <div className="flex w-64 flex-col">
      <div className="max-h-72 overflow-auto">
        {active.map((entry) => (
          <div
            key={entry.columnId}
            className="flex items-center justify-between gap-3 rounded px-1 py-1.5 hover:bg-gray-50"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm text-gray-800">
                {labelById.get(entry.columnId) ?? entry.columnId}
              </span>
              <span className="truncate text-xs text-gray-500">{summarizeFilter(entry)}</span>
            </div>
            <button
              type="button"
              aria-label={`Clear ${labelById.get(entry.columnId) ?? entry.columnId} filter`}
              onClick={() => clearOne(entry.columnId)}
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-primary-8 hover:text-white"
            >
              <RiCloseLine size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={clearAll}
        className="mt-1 flex items-center justify-center gap-1.5 border-t border-gray-100 pt-2 text-sm text-primary-8 transition-colors hover:text-primary-9"
      >
        <RiRestartLine size={14} />
        Reset all filters
      </button>
    </div>
  );

  return (
    <Popover trigger="click" placement="bottomLeft" content={content}>
      <button
        type="button"
        aria-label="Active filters"
        title="Active filters"
        className={cn(
          // icon-only pill matching the column chooser, with an active-count badge
          'relative flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-primary-8 shadow-sm',
          'transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md active:scale-95',
          className
        )}
      >
        <RiFilter3Line size={18} />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-8 px-1 text-[10px] font-semibold text-white">
          {active.length}
        </span>
      </button>
    </Popover>
  );
}
