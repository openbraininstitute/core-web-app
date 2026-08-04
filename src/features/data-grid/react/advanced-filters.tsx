'use client';

import { RiArrowLeftSLine, RiArrowRightSLine, RiCheckLine } from '@remixicon/react';
import { useMemo, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import { resolveFilterPanelGroups, summarizeFilterEntry } from '../core';
import { FilterEditor } from './filters/filter-editor';

import type { KeyboardEvent } from 'react';
import type {
  GridController,
  IGridSchema,
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
 * Menubar → menu → submenu surface for every filter with no visible column right now:
 * the schema's `advancedFilters` plus unticked auxiliary columns. Uses the same
 * {@link FilterEditor} as column headers and commits into the same `GridState.filters`
 * under the filter's `adv:<group>:<filter>` key, so persistence needs no special case.
 * Only one panel is mounted at a time, so an abandoned draft is discarded.
 */
export function AdvancedFiltersMenu<Row>({
  controller,
  state,
  operators,
  facets,
  onClose,
}: IAdvancedFiltersMenuProps<Row>) {
  // Must depend on the reactive hidden-column state: a memo keyed only on `controller`
  // freezes the panel at its first shape as the chooser toggles auxiliary columns.
  const groups = useMemo(
    () => resolveFilterPanelGroups(controller.schema, controller.context, state.hiddenColumns),
    [controller, state.hiddenColumns]
  );

  const [groupId, setGroupId] = useState<string>(() => groups[0]?.id ?? '');
  // Keyed by state key, not `def.id`: two flat-filter auxiliary columns both synthesise
  // a target named `default`, so def ids are not unique within a group.
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  const menubarRef = useRef<HTMLDivElement>(null);

  const group = groups.find((g) => g.id === groupId) ?? groups[0];
  const openFilter = group?.filters.find((f) => f.key === openFilterKey);

  if (!group) return null;

  const openGroup = (id: string) => {
    setGroupId(id);
    setOpenFilterKey(null);
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
      {/* A single group renders a flat list: a one-tab menubar costs a tab stop for nothing. */}
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
              // roving tabindex: one stop for the whole menubar
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
          onBack={() => setOpenFilterKey(null)}
          onClose={onClose}
        />
      ) : (
        <AdvancedFilterList
          group={group}
          schema={controller.schema}
          state={state}
          facets={facets}
          onOpen={setOpenFilterKey}
        />
      )}
    </div>
  );
}

/** A group's menu: its filter NAMES, each opening a submenu. */
function AdvancedFilterList<Row>({
  group,
  schema,
  state,
  facets,
  onOpen,
}: {
  group: IResolvedAdvancedFilterGroup;
  schema: IGridSchema<Row>;
  state: IGridState;
  facets?: TFacets;
  onOpen: (filterKey: string) => void;
}) {
  return (
    <div role="menu" aria-label={group.label} className="flex flex-col">
      {group.description ? (
        <span className="px-1 pb-1.5 text-xs text-gray-400">{group.description}</span>
      ) : null}
      <div className="max-h-72 overflow-auto secondary-scrollbar">
        {group.filters.map((f) => {
          const entry = state.filters[f.key];
          // Resolved through the schema, not `f.def`: only the schema lookup knows which
          // of an auxiliary column's targets the entry is currently matching by.
          const summary = entry ? summarizeFilterEntry(entry, schema, facets) : '';
          return (
            <button
              key={f.key}
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              onClick={() => onOpen(f.key)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') onOpen(f.key);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-primary-8">{f.label}</span>
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
 * `<input>` types for which ArrowLeft is inert. Every other type is assumed to own the
 * key: stealing it from a value editor backs out of the submenu and discards the draft,
 * whereas leaving it costs one shortcut the back chevron and Escape still provide.
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

/** True when ArrowLeft belongs to the focused control, so the submenu must not treat it as "back". */
function ownsArrowLeft(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) return !ARROW_LEFT_INERT_INPUT_TYPES.has(target.type);
  return false;
}

/**
 * One filter's submenu: the shared operator/value editor with its heading replaced by a
 * back control, so the filter's name is not shown twice.
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
      aria-label={filter.label}
      className="flex flex-col"
      onKeyDown={(e) => {
        if (e.key !== 'Escape' && e.key !== 'ArrowLeft') return;
        // ArrowLeft is "back" only from the menu's own rows; see `ownsArrowLeft`.
        if (e.key === 'ArrowLeft' && ownsArrowLeft(e.target)) return;
        // Escape backs out of the submenu first; it must not close the popover too.
        e.stopPropagation();
        onBack();
      }}
    >
      <FilterEditor
        // Remount per filter: carrying the editor's draft across filters would leak a
        // value into the wrong param.
        key={filter.key}
        ctx={ctx}
        filterKey={filter.key}
        label={filter.label}
        titleSlot={
          <button
            type="button"
            onClick={onBack}
            aria-label={`${filter.label} — back to ${filter.groupLabel}`}
            className="-ml-1.5 flex items-center gap-1.5 self-start rounded-full py-0.5 pl-0.5 pr-3 text-left text-[13px] font-semibold text-primary-8 transition-colors bg-gray-50 hover:bg-gray-100"
          >
            <RiArrowLeftSLine size={15} aria-hidden className="shrink-0 text-gray-400" />
            {filter.label}
          </button>
        }
        targets={filter.targets}
        onClose={onClose}
      />
    </div>
  );
}
