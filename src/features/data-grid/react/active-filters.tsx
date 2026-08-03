'use client';

import { RiCloseLine, RiFilter3Line, RiRestartLine } from '@remixicon/react';
import { useMemo, useState } from 'react';

import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import { GridActionType, resolveAdvancedFilterGroups, summarizeFilterEntry } from '../core';
import { AdvancedFiltersMenu } from './advanced-filters';
import { ExpandingToolbarButton } from './expanding-toolbar-button';

import type { GridController, IGridState, OperatorRegistry, TFacets } from '../core';

export interface IActiveFiltersButtonProps<Row> {
  controller: GridController<Row>;
  state: IGridState;
  /** operator registry — required to edit advanced filters, absent for grids without any */
  operators?: OperatorRegistry;
  /** current facet buckets, for facet-sourced advanced filter options */
  facets?: TFacets;
  className?: string;
}

/**
 * Toolbar filter control. It owns BOTH filter concerns that live outside a column
 * header:
 *
 * 1. ADVANCED FILTERS — the schema's `advancedFilters` groups, offered as a menubar
 *    (see {@link AdvancedFiltersMenu}). These are backend filters with no column, so
 *    the toolbar is their only surface.
 * 2. ACTIVE FILTERS — every applied filter, column or advanced, each with its own
 *    reset, plus a global "reset all".
 *
 * Renders whenever the grid HAS advanced filters or IS filtered, so a grid with
 * neither keeps the toolbar clean. Renderer-agnostic: it reads and dispatches only
 * through the controller store, so it works for every grid type.
 */
export function ActiveFiltersButton<Row>({
  controller,
  state,
  operators,
  facets,
  className,
}: IActiveFiltersButtonProps<Row>) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(
    () => resolveAdvancedFilterGroups(controller.schema, controller.context),
    [controller]
  );

  // Label per state key: column headers, plus "Group · Filter" for advanced filters
  // (an advanced label alone — "Design" — is ambiguous once several groups exist).
  const labelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of controller.resolvedColumns()) map.set(c.id, c.header);
    for (const g of groups) {
      for (const f of g.filters) map.set(f.key, `${g.label} · ${f.def.label}`);
    }
    return map;
  }, [controller, groups]);

  // Only filters that actually narrow the grid (non-empty summary) are listed, each
  // paired with the summary shown under its name — resolved to OPTION LABELS, not
  // the wire ids the entry stores (`Modified reconstruction`, not
  // `modified_reconstruction`). Facets are threaded in for facet-sourced options.
  const active = useMemo(
    () =>
      Object.values(state.filters)
        .map((entry) => ({
          entry,
          summary: summarizeFilterEntry(entry, controller.schema, facets),
        }))
        .filter((e) => e.summary !== ''),
    [state.filters, controller.schema, facets]
  );

  const hasAdvanced = groups.length > 0 && operators !== undefined;
  if (active.length === 0 && !hasAdvanced) return null;

  const clearOne = (columnId: string) =>
    controller.store.dispatch({ type: GridActionType.SetFilter, columnId, entry: null });
  const clearAll = () => controller.store.dispatch({ type: GridActionType.ClearFilters });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ExpandingToolbarButton
          icon={<RiFilter3Line size={18} />}
          label={hasAdvanced ? 'Advanced filters' : 'Active filters'}
          badge={
            active.length > 0 ? (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-8 px-1 text-[10px] font-semibold text-white">
                {active.length}
              </span>
            ) : null
          }
          className={className}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={1}
        arrowPadding={12}
        className="w-80 rounded-2xl border-gray-100 bg-white p-3 shadow-[0_10px_34px_-8px_rgba(16,24,40,0.28)]"
        // The operator/option Selects and the date picker portal their content
        // outside this popover; interacting with those must not dismiss it.
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
        <PopoverArrow className="-translate-y-0.75" />
        <div className="flex flex-col gap-2">
          {hasAdvanced && operators ? (
            <AdvancedFiltersMenu
              controller={controller}
              state={state}
              operators={operators}
              facets={facets}
              onClose={() => setOpen(false)}
            />
          ) : null}

          {active.length > 0 && (
            <div className={cn('flex flex-col', hasAdvanced && 'border-t border-gray-100 pt-2')}>
              {hasAdvanced ? (
                <span className="px-1 pb-1 text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                  Applied
                </span>
              ) : null}
              <div className="max-h-72 overflow-auto">
                {active.map(({ entry, summary }) => {
                  const label = labelByKey.get(entry.columnId) ?? entry.columnId;
                  return (
                    <div
                      key={entry.columnId}
                      className="flex items-center justify-between gap-3 rounded px-1 py-1.5 hover:bg-gray-50"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm text-gray-800">{label}</span>
                        <span className="truncate text-xs text-gray-500">{summary}</span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Clear ${label} filter`}
                        onClick={() => clearOne(entry.columnId)}
                        className="flex size-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-primary-8 hover:text-white"
                      >
                        <RiCloseLine size={14} />
                      </button>
                    </div>
                  );
                })}
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
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
