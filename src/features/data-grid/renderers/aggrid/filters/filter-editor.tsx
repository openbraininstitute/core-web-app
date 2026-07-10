import { useMemo, useState } from 'react';

import { CheckListDescription } from '@/features/listing-filter-panel/checklist/option';
import { useDebouncedCallback } from '@/hooks/hooks';
import { Checkbox } from '@/ui/molecules/checkbox';
import { Input } from '@/ui/molecules/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

import { isEmptyFilterValue } from '../../../core';
import { useGridState } from '../use-grid-state';
import { useSetOptions } from './use-set-options';

import type { FilterOptionsSource, FilterValue } from '../../../core';
import type { AgGridContext } from '../ag-context';

const COMMIT_DEBOUNCE_MS = 250;

/** rounded-xl input styling shared by every editor control */
const INPUT_CLASS = 'h-9 rounded-xl text-sm';

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

/** a `type=date` input expects `yyyy-mm-dd`; we store ISO strings */
function toDateInputValue(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '';
}
function fromDateInputValue(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
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

  const commit = (v: FilterValue | null) => {
    if (v === null || isEmptyFilterValue(v)) {
      ctx.controller.store.dispatch({ type: 'setFilter', columnId, entry: null });
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
    ctx.controller.store.dispatch({ type: 'setFilter', columnId, entry: null });
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-primary-8">{columnName || 'Filter'}</span>
        {description ? <span className="text-xs text-gray-400">{description}</span> : null}
      </div>

      {operatorIds.length > 1 && (
        <Select value={operator} onValueChange={onOperatorChange}>
          <SelectTrigger className="h-9 w-full rounded-xl text-sm">
            <SelectValue>{ctx.operators.get(operator).label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {operatorIds.map((id) => (
              <SelectItem key={id} value={id}>
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
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className={INPUT_CLASS}
            value={value.kind === 'dateRange' ? toDateInputValue(value.from) : ''}
            onChange={(e) =>
              commit({
                kind: 'dateRange',
                from: fromDateInputValue(e.target.value),
                to: value.kind === 'dateRange' ? value.to : null,
              })
            }
          />
          <span className="text-gray-300">–</span>
          <Input
            type="date"
            className={INPUT_CLASS}
            value={value.kind === 'dateRange' ? toDateInputValue(value.to) : ''}
            onChange={(e) =>
              commit({
                kind: 'dateRange',
                from: value.kind === 'dateRange' ? value.from : null,
                to: fromDateInputValue(e.target.value),
              })
            }
          />
        </div>
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
              <SelectTrigger className="h-9 w-full rounded-xl text-sm">
                <SelectValue>{{ any: 'Any', yes: 'Yes', no: 'No' }[boolValue]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
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
            commit(null);
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="rounded-xl bg-primary-8 px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-9"
          onClick={onClose}
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
