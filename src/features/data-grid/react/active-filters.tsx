'use client';

import { RiCloseLine, RiFilter3Line, RiRestartLine } from '@remixicon/react';
import { useMemo, useState } from 'react';

import {
  GridActionType,
  resolveFilterPanelGroups,
  summarizeFilterEntry,
} from '@/features/data-grid/core';
import { AdvancedFiltersMenu } from '@/features/data-grid/react/advanced-filters';
import { ExpandingToolbarButton } from '@/features/data-grid/react/expanding-toolbar-button';
import { GRID_OVERLAY_Z_CLASS } from '@/features/data-grid/react/molecules-theme';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type {
  GridController,
  IFilterEntry,
  IGridState,
  OperatorRegistry,
  TFacets,
} from '@/features/data-grid/core';

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
 * Toolbar filter control, owning both filter concerns outside a column header: the
 * advanced-filters menubar ({@link AdvancedFiltersMenu}) and the list of applied filters.
 * Renders only when the grid has advanced filters or is filtered. Renderer-agnostic — it
 * reads and dispatches solely through the controller store.
 */
export function ActiveFiltersButton<Row>({
  controller,
  state,
  operators,
  facets,
  className,
}: IActiveFiltersButtonProps<Row>) {
  const [open, setOpen] = useState(false);

  // Keyed on the reactive `hiddenColumns` so ticking an auxiliary column removes it here.
  const groups = useMemo(
    () => resolveFilterPanelGroups(controller.schema, controller.context, state.hiddenColumns),
    [controller, state.hiddenColumns]
  );

  // Advanced filters are qualified as "Group · Filter" only when the schema has more
  // than one group; a flat schema's single group name would be pure noise.
  const labelByKey = useMemo(() => {
    const map = new Map<string, string>();
    const grouped = groups.length > 1;
    for (const g of groups) {
      for (const f of g.filters) {
        map.set(f.key, grouped ? `${g.label} · ${f.label}` : f.label);
      }
    }
    // Columns last, so a hidden auxiliary column (also in `groups`) is named by its
    // header alone, whichever surface is editing it.
    for (const c of controller.resolvedColumns()) map.set(c.id, c.header);
    return map;
  }, [controller, groups]);

  // Only filters that actually narrow the grid (non-empty summary), each with its summary
  // resolved to option LABELS rather than the wire ids the entry stores.
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
  /** the applied pane earns its column only once something is in it */
  const twoPane = hasAdvanced && active.length > 0;

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
        // the trigger sits in the toolbar's right cluster; `start` would push a 2xl-wide
        // popover off the right of the viewport
        align="end"
        side="bottom"
        sideOffset={1}
        // must be ≥ the panel's `rounded-2xl` (16px), or floating-ui parks the arrow tip
        // on the corner's curve, where it reads as detached
        arrowPadding={16}
        className={cn(
          GRID_OVERLAY_Z_CLASS,
          'rounded-2xl border-gray-100 bg-white p-3 shadow-[0_10px_34px_-8px_rgba(16,24,40,0.28)]',
          'max-w-[calc(100vw-1.5rem)]',
          twoPane ? 'w-2xl' : 'w-80',
          // width is the only thing that moves between the two shapes; Radix re-runs
          // positioning on the resize, so the anchored edge stays put throughout
          'transition-[width] duration-200 ease-out motion-reduce:transition-none'
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
        <PopoverArrow className="-translate-y-0.75" />
        {/* Left: the filter list or the open editor. Right: everything already applied. */}
        {hasAdvanced && operators ? (
          <div className="flex items-stretch gap-3">
            <div className="flex min-w-0 flex-1 flex-col" data-testid="advanced-filters-pane">
              <AdvancedFiltersMenu
                controller={controller}
                state={state}
                operators={operators}
                facets={facets}
                onClose={() => setOpen(false)}
              />
            </div>
            {twoPane ? (
              <div
                data-testid="applied-filters-pane"
                className="flex min-w-0 shrink basis-80 flex-col border-l border-gray-100 pl-3"
              >
                <AppliedFilters
                  active={active}
                  labelByKey={labelByKey}
                  onClearOne={clearOne}
                  onClearAll={clearAll}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <AppliedFilters
            active={active}
            labelByKey={labelByKey}
            onClearOne={clearOne}
            onClearAll={clearAll}
            headless
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

interface IAppliedFilter {
  entry: IFilterEntry;
  /** value summary, already resolved to option LABELS */
  summary: string;
}

/**
 * Every filter currently narrowing the grid, each with its own clear, plus the global
 * reset. `headless` drops the section title, for when this is the popover's only content.
 * Renders nothing when nothing is applied, so the popover narrows to a single pane.
 */
function AppliedFilters({
  active,
  labelByKey,
  onClearOne,
  onClearAll,
  headless,
}: {
  active: ReadonlyArray<IAppliedFilter>;
  labelByKey: ReadonlyMap<string, string>;
  onClearOne: (columnId: string) => void;
  onClearAll: () => void;
  headless?: boolean;
}) {
  if (active.length === 0) return null;

  return (
    <div className="flex min-h-0 flex-col h-full">
      {headless ? null : (
        <span className="px-1 pb-1 text-[11px] font-bold tracking-wide text-primary-8 uppercase">
          Applied Filters
        </span>
      )}
      {/* scrolls on its own so a long list neither stretches the popover nor drags the
          editor pane down */}
      <div className="max-h-72 min-h-0 overflow-y-auto">
        {active.map(({ entry, summary }) => {
          const label = labelByKey.get(entry.columnId) ?? entry.columnId;
          return (
            <div
              key={entry.columnId}
              className="flex items-center justify-between gap-2 rounded px-1 py-1.5 hover:bg-gray-50"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-gray-800" title={label}>
                  {label}
                </span>
                <span className="truncate text-xs text-gray-500" title={summary}>
                  {summary}
                </span>
              </div>
              <button
                type="button"
                aria-label={`Clear ${label} filter`}
                onClick={() => onClearOne(entry.columnId)}
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
        onClick={onClearAll}
        className={cn(
          'flex items-center justify-center gap-1.5 border-t border-gray-100 py-2 text-sm text-primary-8 transition-colors hover:text-primary-9 mt-auto',
          'hover:bg-gray-50'
        )}
      >
        <RiRestartLine size={14} />
        Reset all filters
      </button>
    </div>
  );
}
