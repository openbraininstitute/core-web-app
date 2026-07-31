'use client';

import { RiArrowLeftSLine, RiArrowRightSLine, RiCheckLine } from '@remixicon/react';
import { useMemo, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import { resolveAdvancedFilterGroups, summarizeFilter } from '../core';
import { FilterEditor } from './filters/filter-editor';

import type { KeyboardEvent } from 'react';
import type {
  GridController,
  IGridState,
  IResolvedAdvancedFilter,
  IResolvedAdvancedFilterGroup,
  OperatorRegistry,
  TFacets,
} from '../core';

export interface IAdvancedFiltersMenuProps<Row> {
  controller: GridController<Row>;
  state: IGridState;
  operators: OperatorRegistry;
  facets?: TFacets;
  /** close the surrounding popover once a filter has been applied */
  onClose: () => void;
}

/**
 * ADVANCED FILTERS MENUBAR — the surface for schema-level filters that have no
 * column (`IGridSchema.advancedFilters`).
 *
 * The interaction model is a menubar → menu → submenu: the top row is the groups
 * (roving focus, ←/→ between them), the panel below is that group's menu of filter
 * NAMES, and choosing one opens a submenu holding the operator picker and the value
 * editor (→/Enter in, ←/Escape back). Only ONE panel is mounted at a time, so the
 * popover never grows unboundedly and an abandoned draft is discarded rather than
 * lingering behind a closed menu.
 *
 * The editor is the SAME {@link FilterEditor} the column headers use — an advanced
 * filter IS an `IFilterTarget` — and it commits into the same `GridState.filters`
 * record under the filter's namespaced `adv:<group>:<filter>` key, so persistence,
 * reset and the active-filters list need no special case.
 */
export function AdvancedFiltersMenu<Row>({
  controller,
  state,
  operators,
  facets,
  onClose,
}: IAdvancedFiltersMenuProps<Row>) {
  const groups = useMemo(
    () => resolveAdvancedFilterGroups(controller.schema, controller.context),
    [controller]
  );

  // `openFilterId` is scoped to the open group: changing group always clears it, so
  // the submenu can never be stranded on a filter the current group doesn't own.
  const [groupId, setGroupId] = useState<string>(() => groups[0]?.id ?? '');
  const [openFilterId, setOpenFilterId] = useState<string | null>(null);
  const menubarRef = useRef<HTMLDivElement>(null);

  const group = groups.find((g) => g.id === groupId) ?? groups[0];
  const openFilter = group?.filters.find((f) => f.def.id === openFilterId);

  if (!group) return null;

  const openGroup = (id: string) => {
    setGroupId(id);
    setOpenFilterId(null);
  };

  const moveGroup = (delta: number) => {
    const index = groups.findIndex((g) => g.id === group.id);
    const next = groups[(index + delta + groups.length) % groups.length];
    openGroup(next.id);
    menubarRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
      ?.[groups.indexOf(next)]?.focus();
  };

  const onMenubarKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    moveGroup(e.key === 'ArrowRight' ? 1 : -1);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {groups.length > 1 && (
        <div
          ref={menubarRef}
          role="menubar"
          aria-label="Filter groups"
          className="flex items-center gap-0.5 rounded-xl bg-gray-100 p-0.5"
        >
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={g.id === group.id}
              // roving tabindex: one stop for the whole menubar, arrows move within
              tabIndex={g.id === group.id ? 0 : -1}
              onKeyDown={onMenubarKeyDown}
              onClick={() => openGroup(g.id)}
              className={cn(
                'flex-1 rounded-[10px] px-2 py-1 text-xs font-medium transition-colors',
                g.id === group.id
                  ? 'bg-white text-primary-8 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {openFilter ? (
        <AdvancedFilterSubmenu
          controller={controller}
          operators={operators}
          facets={facets}
          filter={openFilter}
          onBack={() => setOpenFilterId(null)}
          onClose={onClose}
        />
      ) : (
        <AdvancedFilterList group={group} state={state} onOpen={setOpenFilterId} />
      )}
    </div>
  );
}

/** A group's menu: its filter NAMES, each opening a submenu. */
function AdvancedFilterList({
  group,
  state,
  onOpen,
}: {
  group: IResolvedAdvancedFilterGroup;
  state: IGridState;
  onOpen: (filterId: string) => void;
}) {
  return (
    <div role="menu" aria-label={group.label} className="flex flex-col">
      {group.description ? (
        <span className="px-1 pb-1.5 text-xs text-gray-400">{group.description}</span>
      ) : null}
      <div className="max-h-72 overflow-auto">
        {group.filters.map((f) => {
          const entry = state.filters[f.key];
          const summary = entry ? summarizeFilter(entry) : '';
          return (
            <button
              key={f.key}
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              onClick={() => onOpen(f.def.id)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') onOpen(f.def.id);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-primary-8">{f.def.label}</span>
                {summary ? (
                  <span className="truncate text-xs text-primary-6">{summary}</span>
                ) : f.def.description ? (
                  <span className="truncate text-xs text-gray-400">{f.def.description}</span>
                ) : null}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {summary ? <RiCheckLine size={13} className="text-primary-6" /> : null}
                <RiArrowRightSLine size={15} className="text-gray-300" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * `<input>` types for which ArrowLeft is INERT — no caret to move (the checkbox and
 * the button-like types), nothing to step. Every other input type is assumed to own
 * the key: the text-entry types move the caret, `range` steps the value and `radio`
 * moves the selection inside its group.
 *
 * Defaulting to "the control owns ArrowLeft" is deliberate. Stealing the key from a
 * value editor backs out of the submenu and DISCARDS the draft — real data loss —
 * whereas leaving it with an exotic control merely costs one keyboard shortcut that
 * the back chevron, Escape and Shift+Tab all still provide.
 */
const ARROW_LEFT_INERT_INPUT_TYPES: ReadonlySet<string> = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'reset',
  'submit',
]);

/**
 * True when ArrowLeft belongs to the focused control rather than to the menu, i.e.
 * the submenu must NOT treat it as "back": a textarea or contenteditable (caret), a
 * native `<select>` (ArrowLeft changes the selected option) or any input other than
 * the inert types above.
 */
function ownsArrowLeft(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) return !ARROW_LEFT_INERT_INPUT_TYPES.has(target.type);
  return false;
}

/**
 * One filter's submenu: the shared operator/value editor, with its heading replaced
 * by a back control.
 *
 * The chevron is not a separate button next to a separate heading — the whole
 * "‹ Generation type" line IS the title AND the way back to the group's list, so the
 * panel never shows the filter's name twice. `aria-label` opens with that same
 * visible text (WCAG 2.5.3) and then says where "back" leads.
 */
function AdvancedFilterSubmenu<Row>({
  controller,
  operators,
  facets,
  filter,
  onBack,
  onClose,
}: {
  controller: GridController<Row>;
  operators: OperatorRegistry;
  facets?: TFacets;
  filter: IResolvedAdvancedFilter;
  onBack: () => void;
  onClose: () => void;
}) {
  const ctx = useMemo(
    () => ({ controller: controller as GridController<unknown>, operators, facets }),
    [controller, operators, facets]
  );

  return (
    <div
      role="menu"
      aria-label={filter.def.label}
      className="flex flex-col"
      onKeyDown={(e) => {
        if (e.key !== 'Escape' && e.key !== 'ArrowLeft') return;
        // ArrowLeft is "back" only from the menu's OWN rows — inside the editor's
        // value controls it is caret movement, and hijacking it there threw the
        // draft away (see `ownsArrowLeft`). Escape is unconditional: unlike an
        // arrow it means "dismiss this layer" everywhere, including in a text box,
        // and NOT handling it here would simply let it bubble to the popover and
        // close the whole surface — the same lost draft plus the lost surface.
        if (e.key === 'ArrowLeft' && ownsArrowLeft(e.target)) return;
        // Escape backs out of the SUBMENU first; it must not close the popover too.
        e.stopPropagation();
        onBack();
      }}
    >
      <FilterEditor
        // Remount per filter: the editor holds a draft keyed to ONE slot, and
        // carrying it across filters would leak a value into the wrong param.
        key={filter.key}
        ctx={ctx}
        filterKey={filter.key}
        label={filter.def.label}
        titleSlot={
          <button
            type="button"
            onClick={onBack}
            aria-label={`${filter.def.label} — back to ${filter.groupLabel}`}
            className="-ml-1.5 flex items-center gap-1.5 self-start rounded-full py-0.5 pl-0.5 pr-3 text-left text-[13px] font-semibold text-primary-8 transition-colors bg-gray-50 hover:bg-gray-100"
          >
            <RiArrowLeftSLine size={15} aria-hidden className="shrink-0 text-gray-400" />
            {filter.def.label}
          </button>
        }
        targets={[filter.def]}
        onClose={onClose}
      />
    </div>
  );
}
