'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getEtype } from '@/api/entitycore/queries/annotations/etype';
import { getMtype } from '@/api/entitycore/queries/annotations/mtype';
import { useDebouncedCallback } from '@/hooks/hooks';
import { Checkbox } from '@/ui/molecules/checkbox';
import { DateRangePicker } from '@/ui/molecules/date-picker';
import { Input } from '@/ui/molecules/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import { isEmptyFilterValue } from '../../../core';
import {
  GRID_INPUT_CLASS,
  GRID_SELECT_CONTENT_CLASS,
  GRID_SELECT_ITEM_CLASS,
  GRID_SELECT_TRIGGER_CLASS,
} from '../../../react/molecules-theme';
import { useGridState } from '../use-grid-state';
import { useSetOptions } from './use-set-options';

import type { DateRange } from 'react-day-picker';
import type { FilterOptionsSource, FilterValue } from '../../../core';
import type { AgGridContext } from '../ag-context';

const COMMIT_DEBOUNCE_MS = 250;

/** rounded-xl input styling shared by every editor control */
const INPUT_CLASS = GRID_INPUT_CLASS;

export interface FilterEditorProps {
  ctx: AgGridContext;
  columnId: string;
  columnName: string;
  /** key for facet-option lookup (not the serialization field) */
  facetKey: string;
  operatorIds: string[];
  optionsSource?: FilterOptionsSource;
  description?: string;
  /** close the popover (Apply / done) */
  onClose: () => void;
}

function emptyForUiKind(kind: string): FilterValue {
  switch (kind) {
    case 'number':
      return { kind: 'number', value: null };
    case 'range':
      return { kind: 'range', min: null, max: null };
    case 'dateRange':
      return { kind: 'dateRange', from: null, to: null };
    case 'set':
      return { kind: 'set', values: [] };
    case 'boolean':
      return { kind: 'boolean', value: null };
    default:
      return { kind: 'text', text: '' };
  }
}

function toNumber(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** the store keeps ISO strings; the date-range picker works in `Date`s */
function toDateOrUndefined(iso: string | null): Date | undefined {
  return iso ? new Date(iso) : undefined;
}

/**
 * The filter editor rendered inside the header's Radix popover. Built entirely from
 * `ui/molecules` primitives (rounded-xl), it drives the headless store directly —
 * no AG Grid filter model — so styling and positioning are fully ours.
 */
export function FilterEditor({
  ctx,
  columnId,
  columnName,
  facetKey,
  operatorIds,
  optionsSource,
  description,
  onClose,
}: FilterEditorProps) {
  const state = useGridState(ctx.controller);
  const current = state.filters[columnId];

  const [operator, setOperator] = useState<string>(current?.operator ?? operatorIds[0]);
  const uiKind = ctx.operators.get(operator).uiKind;
  const value: FilterValue =
    current && current.operator === operator ? current.value : emptyForUiKind(uiKind);

  // Date ranges are edited locally and only committed on Apply — so picking a single
  // endpoint (or typing one bound) neither refetches the grid nor closes the panel.
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(() =>
    current?.value.kind === 'dateRange'
      ? { from: toDateOrUndefined(current.value.from), to: toDateOrUndefined(current.value.to) }
      : undefined
  );

  const commit = (v: FilterValue | null) => {
    if (v === null || isEmptyFilterValue(v)) {
      ctx.controller.store.dispatch({
        type: 'setFilter',
        columnId,
        entry: null,
      });
    } else {
      ctx.controller.store.dispatch({
        type: 'setFilter',
        columnId,
        entry: { columnId, operator, value: v },
      });
    }
  };
  const debouncedCommit = useDebouncedCallback(commit, [columnId, operator], COMMIT_DEBOUNCE_MS);

  const onOperatorChange = (op: string) => {
    debouncedCommit.cancel();
    setOperator(op);
    setPendingRange(undefined);
    ctx.controller.store.dispatch({ type: 'setFilter', columnId, entry: null });
  };

  const onApply = () => {
    if (uiKind === 'dateRange') {
      const hasValue = pendingRange?.from || pendingRange?.to;
      commit(
        hasValue
          ? {
              kind: 'dateRange',
              from: pendingRange?.from ? pendingRange.from.toISOString() : null,
              to: pendingRange?.to ? pendingRange.to.toISOString() : null,
            }
          : null
      );
    }
    onClose();
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-primary-8">{columnName || 'Filter'}</span>
        {description ? <span className="text-xs text-gray-400">{description}</span> : null}
      </div>

      {operatorIds.length > 1 && (
        <Select value={operator} onValueChange={onOperatorChange}>
          <SelectTrigger className={cn('h-9 w-full', GRID_SELECT_TRIGGER_CLASS)}>
            <SelectValue>{ctx.operators.get(operator).label}</SelectValue>
          </SelectTrigger>
          <SelectContent className={GRID_SELECT_CONTENT_CLASS}>
            {operatorIds.map((id) => (
              <SelectItem key={id} value={id} className={GRID_SELECT_ITEM_CLASS}>
                {ctx.operators.get(id).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {uiKind === 'text' && (
        <Input
          autoFocus
          className={INPUT_CLASS}
          placeholder="Filter…"
          defaultValue={value.kind === 'text' ? value.text : ''}
          onChange={(e) => debouncedCommit({ kind: 'text', text: e.target.value })}
        />
      )}

      {uiKind === 'number' && (
        <Input
          type="number"
          className={INPUT_CLASS}
          placeholder="Value"
          defaultValue={value.kind === 'number' && value.value != null ? String(value.value) : ''}
          onChange={(e) => debouncedCommit({ kind: 'number', value: toNumber(e.target.value) })}
        />
      )}

      {uiKind === 'range' && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className={INPUT_CLASS}
            placeholder="Min"
            defaultValue={value.kind === 'range' && value.min != null ? String(value.min) : ''}
            onChange={(e) =>
              debouncedCommit({
                kind: 'range',
                min: toNumber(e.target.value),
                max: value.kind === 'range' ? value.max : null,
              })
            }
          />
          <span className="text-gray-300">–</span>
          <Input
            type="number"
            className={INPUT_CLASS}
            placeholder="Max"
            defaultValue={value.kind === 'range' && value.max != null ? String(value.max) : ''}
            onChange={(e) =>
              debouncedCommit({
                kind: 'range',
                min: value.kind === 'range' ? value.min : null,
                max: toNumber(e.target.value),
              })
            }
          />
        </div>
      )}

      {uiKind === 'dateRange' && (
        // edits stay local (pendingRange) until Apply — see onApply
        <DateRangePicker value={pendingRange} onChange={setPendingRange} />
      )}

      {uiKind === 'boolean' &&
        (() => {
          const boolValue =
            value.kind === 'boolean' && value.value != null ? (value.value ? 'yes' : 'no') : 'any';
          return (
            <Select
              value={boolValue}
              onValueChange={(v) =>
                commit(v === 'any' ? null : { kind: 'boolean', value: v === 'yes' })
              }
            >
              <SelectTrigger className={cn('h-9 w-full', GRID_SELECT_TRIGGER_CLASS)}>
                <SelectValue>{{ any: 'Any', yes: 'Yes', no: 'No' }[boolValue]}</SelectValue>
              </SelectTrigger>
              <SelectContent className={GRID_SELECT_CONTENT_CLASS}>
                <SelectItem value="any" className={GRID_SELECT_ITEM_CLASS}>
                  Any
                </SelectItem>
                <SelectItem value="yes" className={GRID_SELECT_ITEM_CLASS}>
                  Yes
                </SelectItem>
                <SelectItem value="no" className={GRID_SELECT_ITEM_CLASS}>
                  No
                </SelectItem>
              </SelectContent>
            </Select>
          );
        })()}

      {uiKind === 'set' && (
        <SetEditor
          facetKey={facetKey}
          optionsSource={optionsSource}
          ctx={ctx}
          selected={value.kind === 'set' ? value.values : []}
          onChange={(values) => commit({ kind: 'set', values })}
        />
      )}

      <div className="mt-0.5 flex items-center justify-between border-t border-gray-100 pt-3">
        <button
          type="button"
          className="text-[13px] font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
          onClick={() => {
            debouncedCommit.cancel();
            setPendingRange(undefined);
            commit(null);
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="rounded-xl bg-primary-8 px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-9"
          onClick={onApply}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function SetEditor({
  facetKey,
  optionsSource,
  ctx,
  selected,
  onChange,
}: {
  facetKey: string;
  optionsSource?: FilterOptionsSource;
  ctx: AgGridContext;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const { options, loading } = useSetOptions(optionsSource, facetKey, ctx);
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selectedSet);
    if (checked) next.add(id);
    else next.delete(id);
    onChange([...next]);
  };

  return (
    <div className="flex max-h-72 w-full flex-col gap-2">
      <Input
        className={INPUT_CLASS}
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="flex justify-between text-xs font-medium">
        <button
          type="button"
          className="text-primary-6 hover:text-primary-7"
          onClick={() => onChange(visible.map((o) => o.value))}
        >
          Select all
        </button>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600"
          onClick={() => onChange([])}
        >
          Clear
        </button>
      </div>
      <div className="-mx-1.5 flex flex-col overflow-auto">
        {loading ? (
          <div className="py-3 text-center text-xs text-gray-400">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="py-3 text-center text-xs text-gray-400">No options</div>
        ) : (
          visible.map((o) => (
            <div key={o.id} className="rounded-lg px-1.5 py-1 hover:bg-gray-50">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: the checkbox is nested as the control */}
              <label
                className={cn('flex cursor-pointer items-center gap-2 text-sm')}
                title={o.label}
              >
                <Checkbox
                  checked={selectedSet.has(o.value)}
                  onCheckedChange={(checked) => toggle(o.value, checked === true)}
                  className="shrink-0 **:data-[slot=checkbox-indicator]:text-white!"
                />
                <span className="flex-1 truncate text-primary-8">{o.label}</span>
                {o.count != null && (
                  <span className="shrink-0 rounded-full bg-gray-100 px-1.5 text-[11px] text-gray-500">
                    {o.count}
                  </span>
                )}
              </label>
              {(o.type === 'mtype' || o.type === 'etype') && (
                <span className="block pl-6 text-[11px] text-gray-400">
                  <CheckListDescription id={o.id} type={o.type} />
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CheckListDescription({ id, type }: { id: string; type: 'mtype' | 'etype' }) {
  const { data } = useQuery({
    queryKey: keyBuilder.annotation({ entityId: id }),
    queryFn: async () => {
      if (type === 'mtype') return await getMtype({ id });
      return await getEtype({ id });
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return (
    <span className="text-gray-600 text-left wrap-break-word hyphens-auto">{data?.definition}</span>
  );
}
