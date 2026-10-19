'use client';

import { GlobalOutlined } from '@ant-design/icons';
import { RiArrowUpSLine, RiExpandUpDownLine, RiFilter3Fill } from '@remixicon/react';
import { useEffect, useSyncExternalStore } from 'react';

import {
  SCOPE_COLORS,
  ScopeMark,
  useProjectScopeIcon,
  useScopeMarks,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-cell';
import {
  SCOPE_LABELS,
  ScopeTooltip,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-tooltip';
import {
  isScopeKind,
  SCOPE_KINDS,
  SCOPE_SORT_ORDERS,
  scopeView,
  shownBy,
  showScope,
  toggled,
  viewFilter,
} from '@/features/data-grid/bindings/entitycore/scope-filter';
import {
  FilterValueKind,
  GridActionType,
  OperatorId,
  SortDirection,
} from '@/features/data-grid/core';
import { GRID_OVERLAY_Z_CLASS } from '@/features/data-grid/react/molecules-theme';
import { useGridState } from '@/features/data-grid/react/use-grid-state';
import { Checkbox } from '@/ui/molecules/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type { IScopeView, TScopeKind } from '@/features/data-grid/bindings/entitycore/scope-filter';
import type { GridController } from '@/features/data-grid/core';
import type { IHeaderRendererProps } from '@/features/data-grid/react';

/** Header-renderer registry key for the public/project toggles. */
export const SCOPE_HEADER_RENDERER = 'scopeHeader';

const SORT_HINTS: Record<TScopeKind, string> = {
  public: 'Public data from elsewhere first',
  project: "This project's private data first",
  published: 'Data this project made public first',
};

/** The sort bar's place: under the globe, the people, or both for the made-public data. */
const SORT_BAR: Record<TScopeKind, string> = {
  public: 'left-1.5 w-3',
  project: 'left-7.5 w-3',
  published: 'left-1.5 w-9',
};

/** The two marks, each standing alone for one kind of row. */
export const TOGGLES = [
  { kind: 'public', other: 'project', label: 'Public' },
  { kind: 'project', other: 'public', label: 'Project' },
] as const;

/**
 * The globe and the people as filter toggles: switching one off hides every row bearing
 * it (the made-public rows bear both), and the last one on stays on. Beside them a sort
 * button cycles through the orders that list each kind of row first, with a bar under
 * the marks of the kind on top.
 */
function ScopeSortHeader({ columnId, ctx }: Pick<IHeaderRendererProps, 'columnId' | 'ctx'>) {
  const state = useGridState(ctx.controller);
  const ProjectIcon = useProjectScopeIcon();
  const entry = state.filters[columnId];
  const shown = shownBy(entry?.value.kind === FilterValueKind.Text ? entry.value.text : '');
  const order = state.sort.find((s) => s.columnId === columnId)?.order;
  const first = isScopeKind(order) ? order : null;
  const next = SCOPE_SORT_ORDERS[first ? SCOPE_SORT_ORDERS.indexOf(first) + 1 : 0];

  return (
    <div className="flex h-full w-full items-center justify-center gap-1">
      <div className="relative flex">
        {TOGGLES.map(({ kind, other, label }) => {
          const isOn = shown.has(kind);
          const isLast = isOn && !shown.has(other);
          const Icon = kind === 'public' ? GlobalOutlined : ProjectIcon;
          return (
            <ScopeTooltip key={kind} kind={kind}>
              <button
                type="button"
                aria-pressed={isOn}
                aria-disabled={isLast}
                data-testid={`scope-header-${kind}`}
                onClick={() => {
                  if (isLast) return;
                  // switching one off leaves the other's own rows; back on shows them all
                  showScope(
                    ctx.controller,
                    columnId,
                    new Set<TScopeKind>(isOn ? [other] : SCOPE_KINDS)
                  );
                }}
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-lg transition-colors',
                  'focus-visible:ring-primary-6 outline-none focus-visible:ring-2',
                  isOn ? SCOPE_COLORS[kind] : 'text-gray-300 hover:text-gray-500',
                  isLast ? 'cursor-default' : 'hover:bg-gray-100'
                )}
              >
                <Icon aria-label={label} />
              </button>
            </ScopeTooltip>
          );
        })}
        {first && (
          <span
            aria-hidden
            className={cn(
              'bg-primary-6 absolute -bottom-1 h-0.5 rounded-full transition-all duration-200',
              SORT_BAR[first]
            )}
          />
        )}
      </div>
      <button
        type="button"
        data-testid="scope-sort"
        title={first ? SORT_HINTS[first] : 'Sort by scope'}
        onClick={(event) => {
          const others = event.shiftKey ? state.sort.filter((s) => s.columnId !== columnId) : [];
          ctx.controller.store.dispatch({
            type: GridActionType.SetSort,
            sort: next
              ? [{ columnId, direction: SortDirection.Asc, order: next }, ...others]
              : others,
          });
        }}
        className="group flex size-5 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100"
      >
        {first ? (
          <RiArrowUpSLine size={16} className="text-primary-6" />
        ) : (
          <RiExpandUpDownLine
            size={14}
            className="text-gray-300 transition-colors group-hover:text-gray-500"
          />
        )}
      </button>
    </div>
  );
}

/**
 * Which scope column's panel is open, per grid. New facets refresh the grid's headers,
 * which remounts them, so the panel cannot keep its openness in its own state.
 */
const openPanels = new WeakMap<object, string>();
const panelListeners = new Set<() => void>();

function setPanelOpen(grid: object, columnId: string, open: boolean) {
  if (open) openPanels.set(grid, columnId);
  else if (openPanels.get(grid) === columnId) openPanels.delete(grid);
  for (const listener of panelListeners) listener();
}

function usePanelOpen(grid: object, columnId: string) {
  return useSyncExternalStore(
    (listener) => {
      panelListeners.add(listener);
      return () => panelListeners.delete(listener);
    },
    () => openPanels.get(grid) === columnId,
    () => false
  );
}

/**
 * The scope filter as the globe and the people show it, wherever they sit: with both on a
 * click keeps only that mark, and with one on a click on either brings both back.
 */
export function useScopeSides<Row>(controller: GridController<Row>, columnId: string) {
  const state = useGridState(controller);
  const entry = state.filters[columnId];
  const view = scopeView(entry?.value.kind === FilterValueKind.Text ? entry.value.text : '');

  const set = (next: IScopeView) => {
    const value = viewFilter(next);
    controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId,
      keepSelection: true,
      entry: value
        ? { columnId, operator: OperatorId.Eq, value: { kind: FilterValueKind.Text, text: value } }
        : null,
    });
  };
  const choose = (kind: 'public' | 'project') => {
    setPanelOpen(controller, columnId, false);
    set({ side: view.side ? null : kind, single: true, joint: true });
  };
  return { state, view, set, choose };
}

/** What a side holds: the rows bearing its mark alone, and those bearing both. */
const PARTS = [
  { part: 'single', labels: { public: 'From other projects', project: 'Private' } },
  { part: 'joint', labels: { public: 'Made public by this project', project: 'Made public' } },
] as const;

/**
 * The globe and the people choose public data, the project's, or both: with both on a
 * click keeps only that mark, and with one on a click on either brings both back. With
 * one side chosen, the classic filter button slides in beside them and can leave out the
 * rows bearing its mark alone, or those bearing both (the project's made-public data).
 */
function ScopeFilterHeader({ columnId, ctx }: Pick<IHeaderRendererProps, 'columnId' | 'ctx'>) {
  const { state, view, set, choose } = useScopeSides(ctx.controller, columnId);
  const ProjectIcon = useProjectScopeIcon();
  const open = usePanelOpen(ctx.controller, columnId);
  const setOpen = (next: boolean) => setPanelOpen(ctx.controller, columnId, next);
  const { side } = view;

  // this design has no scope order, so one left by the sorting design must not linger
  const sortedByScope = state.sort.some((s) => s.columnId === columnId);
  useEffect(() => {
    if (!sortedByScope) return;
    ctx.controller.store.dispatch({
      type: GridActionType.SetSort,
      sort: state.sort.filter((s) => s.columnId !== columnId),
    });
  }, [sortedByScope, state.sort, ctx.controller, columnId]);

  // the panel goes with the button, whatever chose both sides
  useEffect(() => {
    if (!side) setPanelOpen(ctx.controller, columnId, false);
  }, [side, ctx.controller, columnId]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      {/* with one side chosen the marks move over, centring them with the filter button */}
      <div
        className={cn(
          'relative flex transition-[translate] duration-200 ease-out',
          side && '-translate-x-3.5'
        )}
      >
        {TOGGLES.map(({ kind, other, label }) => {
          const isOn = side !== other;
          const Icon = kind === 'public' ? GlobalOutlined : ProjectIcon;
          return (
            <ScopeTooltip key={kind} kind={kind}>
              <button
                type="button"
                aria-pressed={isOn}
                data-testid={`scope-header-${kind}`}
                onClick={() => choose(kind)}
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-lg transition-colors hover:bg-gray-100',
                  'focus-visible:ring-primary-6 outline-none focus-visible:ring-2',
                  isOn ? SCOPE_COLORS[kind] : 'text-gray-300 hover:text-gray-500'
                )}
              >
                <Icon aria-label={label} />
              </button>
            </ScopeTooltip>
          );
        })}
        <Popover open={open && side !== null} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-testid="scope-filter-trigger"
              aria-hidden={!side}
              tabIndex={side ? 0 : -1}
              aria-label={side === 'project' ? "Filter this project's data" : 'Filter public data'}
              className={cn(
                'absolute top-1/2 left-full ml-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-200 ease-out',
                !side && 'pointer-events-none scale-75 opacity-0',
                open
                  ? 'text-primary-8 bg-white shadow-sm ring-1 ring-gray-200'
                  : view.single && view.joint
                    ? 'hover:text-primary-7 text-gray-500 hover:bg-gray-100'
                    : 'bg-primary-6 hover:bg-primary-7 text-white shadow-sm'
              )}
            >
              <RiFilter3Fill size={13} />
            </button>
          </PopoverTrigger>
          {side && (
            <PopoverContent
              data-testid="scope-filter-panel"
              align="end"
              side="bottom"
              sideOffset={6}
              className={cn(
                GRID_OVERLAY_Z_CLASS,
                'w-max max-w-80 rounded-xl border-gray-100 bg-white p-3 shadow-[0_10px_34px_-8px_rgba(16,24,40,0.28)]'
              )}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-col">
                  <span className="text-primary-8 text-[13px] font-semibold">
                    {side === 'public' ? 'Public data' : "This project's data"}
                  </span>
                  <span className="text-xs text-gray-400">Untick what to leave out</span>
                </div>
                <div className="-mx-1.5 flex flex-col">
                  {PARTS.map(({ part, labels }) => {
                    const checked = view[part];
                    const isOnly = checked && !view[part === 'single' ? 'joint' : 'single'];
                    return (
                      <div key={part} className="rounded-lg px-1.5 py-0.5 hover:bg-gray-50">
                        {/* biome-ignore lint/a11y/noLabelWithoutControl: the checkbox is nested as the control */}
                        <label
                          className={cn(
                            'flex items-center gap-2 text-sm',
                            isOnly ? 'cursor-default' : 'cursor-pointer'
                          )}
                        >
                          <Checkbox
                            data-testid={`scope-filter-${part}`}
                            checked={checked}
                            disabled={isOnly}
                            onCheckedChange={(value) => set({ ...view, [part]: value === true })}
                            className="shrink-0 **:data-[slot=checkbox-indicator]:text-white!"
                          />
                          <span className="text-primary-8 flex-1">{labels[side]}</span>
                          <span className="flex shrink-0 text-base">
                            <ScopeMark kind={part === 'joint' ? 'published' : side} />
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          )}
        </Popover>
      </div>
    </div>
  );
}

/**
 * A toggle per kind of row in place of the scope column's label and filter, coloured
 * when its rows are shown and grey when not. All on (the default) filters nothing.
 */
export function ScopeHeader({ columnId, ctx }: IHeaderRendererProps) {
  const marks = useScopeMarks();
  const state = useGridState(ctx.controller);
  const entry = state.filters[columnId];
  const shown = shownBy(entry?.value.kind === FilterValueKind.Text ? entry.value.text : '');
  const show = (kinds: Set<TScopeKind>) => showScope(ctx.controller, columnId, kinds);

  if (marks === 'sort') return <ScopeSortHeader columnId={columnId} ctx={ctx} />;
  if (marks === 'filter') return <ScopeFilterHeader columnId={columnId} ctx={ctx} />;

  return (
    <div className="flex h-full w-full items-center justify-center gap-0.5">
      {SCOPE_KINDS.map((kind) => {
        const isOn = shown.has(kind);
        const next = toggled(shown, kind);
        const heldByPublic = kind === 'published' && isOn && shown.has('public');
        return (
          <ScopeTooltip
            key={kind}
            kind={kind}
            note={heldByPublic ? 'Shown while public data is: it is public too' : undefined}
          >
            <button
              type="button"
              aria-pressed={isOn}
              aria-disabled={!next}
              aria-label={SCOPE_LABELS[kind]}
              data-testid={`scope-header-${kind}`}
              onClick={() => next && show(next)}
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-lg transition-colors',
                'focus-visible:ring-primary-6 outline-none focus-visible:ring-2',
                isOn
                  ? kind === 'public'
                    ? SCOPE_COLORS.public
                    : SCOPE_COLORS.project
                  : 'text-gray-300 hover:text-gray-500',
                next ? 'hover:bg-gray-100' : 'cursor-default'
              )}
            >
              <ScopeMark kind={kind} muted={!isOn} />
            </button>
          </ScopeTooltip>
        );
      })}
    </div>
  );
}
