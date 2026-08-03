'use client';

import { RiCloseLine, RiFilter3Line, RiRestartLine } from '@remixicon/react';
import { useMemo, useState } from 'react';

import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import { GridActionType, resolveAdvancedFilterGroups, summarizeFilterEntry } from '../core';
import { AdvancedFiltersMenu } from './advanced-filters';
import { ExpandingToolbarButton } from './expanding-toolbar-button';
import { GRID_OVERLAY_Z_CLASS } from './molecules-theme';

import type { GridController, IFilterEntry, IGridState, OperatorRegistry, TFacets } from '../core';

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

  // Label per state key: column headers, plus the advanced filter's own label —
  // qualified as "Group · Filter" ONLY when the schema actually groups, where a bare
  // "Design" would be ambiguous. A flat schema has one meaningless group name and
  // prefixing every row with it is pure noise.
  const labelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of controller.resolvedColumns()) map.set(c.id, c.header);
    const grouped = groups.length > 1;
    for (const g of groups) {
      for (const f of g.filters) {
        map.set(f.key, grouped ? `${g.label} · ${f.def.label}` : f.def.label);
      }
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
        // The trigger now lives in the toolbar's RIGHT cluster, so the panel hangs
        // inward from that edge; anchoring it `start` would push a 2xl-wide popover
        // off the right of the viewport.
        align="end"
        side="bottom"
        sideOffset={1}
        // ≥ the panel's `rounded-2xl` (16px): floating-ui clamps the arrow to this
        // distance from the content's edge, so anything smaller parks the tip on the
        // corner's CURVE, where it reads as detached from the panel.
        arrowPadding={16}
        className={cn(
          GRID_OVERLAY_Z_CLASS,
          'rounded-2xl border-gray-100 bg-white p-3 shadow-[0_10px_34px_-8px_rgba(16,24,40,0.28)]',
          'max-w-[calc(100vw-1.5rem)]',
          // TWO PANES only when there is something in BOTH of them: the filter list
          // and at least one applied filter. An empty "Applied filters" column is
          // 350px of the panel spent saying nothing, so the popover is the single
          // narrow column until the first filter lands. `max-w` keeps it inside the
          // viewport on a narrow window; the panes shrink, they never overflow.
          twoPane ? 'w-2xl' : 'w-80',
          // width is the ONLY thing that moves between the two shapes, and it moves
          // over 200ms rather than snapping (Radix re-runs positioning on the resize,
          // so the anchored edge stays put throughout)
          'transition-[width] duration-200 ease-out motion-reduce:transition-none'
        )}
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
        {/*
          LEFT: the filter list, or the open filter's editor with its own Reset +
          Apply. RIGHT: everything already applied, with the global reset, behind a
          hairline divider. Stacked, applying a filter pushed the applied list out of
          view; side by side, choosing and reviewing are visible at once, and the
          reading order matches the doing order — pick on the left, review on the
          right.

          The panel is anchored `align="end"`, so its right edge is pinned to the
          trigger and the second pane arrives by growing the panel leftward: the
          filter list shifts left as it appears. That is why the width is
          TRANSITIONED rather than snapped (see the content class above) — the list
          glides under the pointer over 200ms instead of teleporting. Paying that to
          keep "applied" on the right is the deliberate trade: an applied list that
          reads left of the thing it was applied from is more confusing than a
          200ms slide.
        */}
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
 * The APPLIED pane: every filter currently narrowing the grid, each with its own
 * clear, plus the global reset. It is one of the popover's two columns when the grid
 * has advanced filters and its only content otherwise (`headless`, which drops the
 * section title because there is nothing to distinguish it from).
 *
 * Renders NOTHING when nothing is applied — an empty column has no content to justify
 * it, and the popover narrows to a single pane instead (see the `flex-row-reverse`
 * note above for why that costs no movement under the pointer).
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
      {/* scrolls on its own: a long applied list must not stretch the popover past
          the viewport, nor drag the editor pane down with it */}
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
