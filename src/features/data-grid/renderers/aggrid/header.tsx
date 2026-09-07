import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiExpandUpDownLine,
  RiFilter3Fill,
} from '@remixicon/react';
import { useState } from 'react';

import { GridActionType, SortDirection, summarizeFilter } from '@/features/data-grid/core';
import { FilterEditor } from '@/features/data-grid/react/filters/filter-editor';
import { GRID_OVERLAY_Z_CLASS } from '@/features/data-grid/react/molecules-theme';
import { useGridState } from '@/features/data-grid/react/use-grid-state';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type { CustomHeaderProps } from 'ag-grid-react';
import type { MouseEvent, ReactNode } from 'react';
import type { IFilterTarget } from '@/features/data-grid/core';
import type { IAgGridContext } from '@/features/data-grid/renderers/aggrid/ag-context';

interface HeaderParams {
  columnId: string;
  unit?: string;
  sortable?: boolean;
  /** rich header node rendered in place of the plain `displayName` string */
  headerNode?: ReactNode;
  /** present when the column is filterable in this context */
  filter?: {
    targets: ReadonlyArray<IFilterTarget>;
  };
}

/**
 * Custom header. Sorting is server-side (AG Grid's own sort is disabled): clicking the
 * label dispatches `toggleSort` and the icon reflects the store. Filtering opens a Radix
 * popover from an icon button, so there is no AG floating-filter row.
 */
export function AgHeader(props: CustomHeaderProps) {
  const ctx = props.context as IAgGridContext;
  const { columnId, unit, sortable, filter, headerNode } = props as CustomHeaderProps &
    HeaderParams;
  const state = useGridState(ctx.controller);
  const [open, setOpen] = useState(false);

  const entry = state.sort.find((s) => s.columnId === columnId);
  const rank = entry ? state.sort.findIndex((s) => s.columnId === columnId) : -1;

  const filterEntry = state.filters[columnId];
  const filterActive = Boolean(filterEntry && summarizeFilter(filterEntry));

  const onSortClick = (e: MouseEvent) => {
    if (!sortable) return;
    ctx.controller.store.dispatch({
      type: GridActionType.ToggleSort,
      columnId,
      allowMulti: e.shiftKey,
    });
  };

  return (
    <div className="flex h-full w-full items-center gap-1">
      <button
        type="button"
        onClick={onSortClick}
        className={cn(
          'group flex h-full min-w-0 flex-1 items-center gap-1.5 text-left',
          sortable ? 'cursor-pointer' : 'cursor-default'
        )}
      >
        {headerNode !== undefined ? (
          <span className="flex min-w-0 flex-1 items-center">{headerNode}</span>
        ) : (
          <span
            title={props.displayName}
            className="line-clamp-2 min-w-0 font-light whitespace-normal text-gray-500 wrap-break-word"
          >
            {props.displayName}
          </span>
        )}
        {unit ? <span className="text-xs font-light text-gray-500">[{unit}]</span> : null}
        {sortable && (
          <span className="flex shrink-0 items-center gap-0.5">
            {entry?.direction === SortDirection.Asc ? (
              <RiArrowUpSLine size={16} className="text-primary-6" />
            ) : entry?.direction === SortDirection.Desc ? (
              <RiArrowDownSLine size={16} className="text-primary-6" />
            ) : (
              <RiExpandUpDownLine
                size={14}
                className="text-gray-300 transition-colors group-hover:text-gray-400"
              />
            )}
            {rank > 0 && (
              <span className="text-[10px] font-semibold text-primary-5">{rank + 1}</span>
            )}
          </span>
        )}
      </button>

      {filter && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Filter ${props.displayName}`}
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full transition-colors',
                open
                  ? 'bg-white text-primary-8 shadow-sm ring-1 ring-gray-200'
                  : filterActive
                    ? 'bg-primary-6 text-white shadow-sm hover:bg-primary-7'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-primary-7'
              )}
            >
              <RiFilter3Fill size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            data-testid="column-filter-panel"
            align="end"
            side="bottom"
            sideOffset={6}
            className={cn(
              GRID_OVERLAY_Z_CLASS,
              'w-72 rounded-2xl border-gray-100 bg-white p-4 shadow-[0_10px_34px_-8px_rgba(16,24,40,0.28)]'
            )}
            // the Selects and date picker portal outside this popover; using them must not
            // dismiss it
            onInteractOutside={(e) => {
              const target = e.target as Element | null;
              if (
                target?.closest(
                  '[data-slot="select-content"],[data-radix-select-viewport],[role="listbox"],[data-slot="popover-content"]'
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <FilterEditor
              ctx={ctx}
              filterKey={columnId}
              label={props.displayName ?? ''}
              targets={filter.targets}
              onClose={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
