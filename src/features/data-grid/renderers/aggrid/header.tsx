import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiExpandUpDownLine,
  RiFilter3Fill,
} from '@remixicon/react';
import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import { FilterEditor } from './filters/filter-editor';
import { summarizeFilter } from './filters/summary';
import { useGridState } from './use-grid-state';

import type { CustomHeaderProps } from 'ag-grid-react';
import type { MouseEvent, ReactNode } from 'react';
import type { FilterOptionsSource } from '../../core';
import type { AgGridContext } from './ag-context';

interface HeaderParams {
  columnId: string;
  unit?: string;
  sortable?: boolean;
  /**
   * Rich header node (multi-line labels, icons, tooltips) rendered in place of the
   * plain `displayName` string. Backward-compatible: omit it for a text header.
   */
  headerNode?: ReactNode;
  /** filter configuration, present when the column is filterable in this context */
  filter?: {
    facetKey: string;
    operatorIds: string[];
    optionsSource?: FilterOptionsSource;
    description?: string;
  };
}

/**
 * Custom header. Sorting is server-side (AG Grid's own sort disabled): clicking the
 * label dispatches `toggleSort`; the icon reflects the store (unsorted → up/down
 * chevron, asc → up, desc → down, plus a multi-sort rank badge). Filtering lives in
 * a compact round icon-button that opens the app's Radix popover anchored to it —
 * no AG floating-filter row, so the grid saves vertical space.
 */
export function AgHeader(props: CustomHeaderProps) {
  const ctx = props.context as AgGridContext;
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
    ctx.controller.store.dispatch({ type: 'toggleSort', columnId, allowMulti: e.shiftKey });
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
          <span className="truncate font-light text-gray-400">{props.displayName}</span>
        )}
        {unit ? <span className="text-xs font-light text-gray-400">[{unit}]</span> : null}
        {sortable && (
          <span className="flex shrink-0 items-center gap-0.5">
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
                // open panel: raised white pill with a primary-8 icon
                open
                  ? 'bg-white text-primary-8 shadow-sm ring-1 ring-gray-200'
                  : filterActive
                    ? 'bg-primary-6 text-white shadow-sm hover:bg-primary-7'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-primary-7'
              )}
            >
              <RiFilter3Fill size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={6}
            className="w-72 rounded-2xl border-gray-100 bg-white p-4 shadow-[0_10px_34px_-8px_rgba(16,24,40,0.28)]"
            // The operator/facet Selects and the date-picker calendar portal their
            // content outside this popover; don't let interacting with those (a
            // dropdown option, a calendar day) dismiss the filter panel.
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
              columnId={columnId}
              columnName={props.displayName ?? ''}
              facetKey={filter.facetKey}
              operatorIds={filter.operatorIds}
              optionsSource={filter.optionsSource}
              description={filter.description}
              onClose={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
