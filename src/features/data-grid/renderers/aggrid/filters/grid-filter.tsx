import { useGridFilter } from 'ag-grid-react';
import { Checkbox, DatePicker, Input, InputNumber, Radio, Select } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useRef, useState } from 'react';

import { CheckListDescription } from '@/features/listing-filter-panel/checklist/option';
import { useDebouncedCallback } from '@/hooks/hooks';
import { cn } from '@/utils/css-class';

import { isEmptyFilterValue } from '../../../core';
import { useGridState } from '../use-grid-state';
import { useSetOptions } from './use-set-options';

import type { CustomFilterProps } from 'ag-grid-react';
import type { FilterOptionsSource, FilterValue } from '../../../core';
import type { AgGridContext } from '../ag-context';

const { RangePicker } = DatePicker;
const COMMIT_DEBOUNCE_MS = 250;

export interface GridFilterParams {
  columnId: string;
  /** key for facet-option lookup (not the serialization field) */
  facetKey: string;
  operatorIds: string[];
  optionsSource?: FilterOptionsSource;
  description?: string;
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

/**
 * One cohesive filter popup per column: an operator selector (when a column
 * supports more than one operator) plus the editor for the active operator's UI
 * kind. Filtering is server-side, so `doesFilterPass` always passes and changes are
 * dispatched to the headless store (which refetches). `onModelChange` is used only
 * to toggle AG Grid's "filter active" affordance.
 */
export function GridFilter(props: CustomFilterProps) {
  const hidePopupRef = useRef<(() => void) | null>(null);
  useGridFilter({
    doesFilterPass: () => true,
    afterGuiAttached: (p) => {
      hidePopupRef.current = p?.hidePopup ?? null;
    },
  });

  const ctx = props.context as AgGridContext;
  const { columnId, facetKey, operatorIds, optionsSource, description } =
    props as CustomFilterProps & GridFilterParams;
  const state = useGridState(ctx.controller);
  const current = state.filters[columnId];

  const [operator, setOperator] = useState<string>(current?.operator ?? operatorIds[0]);
  const uiKind = ctx.operators.get(operator).uiKind;
  const value: FilterValue =
    current && current.operator === operator ? current.value : emptyForUiKind(uiKind);

  const commit = (v: FilterValue | null) => {
    if (v === null || isEmptyFilterValue(v)) {
      ctx.controller.store.dispatch({ type: 'setFilter', columnId, entry: null });
      props.onModelChange(null);
    } else {
      ctx.controller.store.dispatch({
        type: 'setFilter',
        columnId,
        entry: { columnId, operator, value: v },
      });
      props.onModelChange({ active: true });
    }
  };
  const debouncedCommit = useDebouncedCallback(commit, [columnId, operator], COMMIT_DEBOUNCE_MS);

  const onOperatorChange = (op: string) => {
    debouncedCommit.cancel();
    setOperator(op);
    ctx.controller.store.dispatch({ type: 'setFilter', columnId, entry: null });
    props.onModelChange(null);
  };

  const columnName = props.column.getColDef().headerName ?? '';

  return (
    <div className="flex w-72 flex-col gap-3 p-3.5">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-primary-8">{columnName || 'Filter'}</span>
        {description ? <span className="text-xs text-gray-400">{description}</span> : null}
      </div>
      {operatorIds.length > 1 && (
        <Select
          size="small"
          value={operator}
          onChange={onOperatorChange}
          options={operatorIds.map((id) => ({
            value: id,
            label: ctx.operators.get(id).label,
          }))}
        />
      )}

      {uiKind === 'text' && (
        <Input
          size="small"
          autoFocus
          allowClear
          placeholder="Filter…"
          defaultValue={value.kind === 'text' ? value.text : ''}
          onChange={(e) => debouncedCommit({ kind: 'text', text: e.target.value })}
        />
      )}

      {uiKind === 'number' && (
        <InputNumber
          size="small"
          className="w-full"
          value={value.kind === 'number' ? value.value : null}
          onChange={(v) =>
            debouncedCommit({ kind: 'number', value: typeof v === 'number' ? v : null })
          }
        />
      )}

      {uiKind === 'range' && (
        <div className="flex items-center gap-1">
          <InputNumber
            size="small"
            placeholder="Min"
            value={value.kind === 'range' ? value.min : null}
            onChange={(v) =>
              debouncedCommit({
                kind: 'range',
                min: typeof v === 'number' ? v : null,
                max: value.kind === 'range' ? value.max : null,
              })
            }
          />
          <span className="text-gray-400">–</span>
          <InputNumber
            size="small"
            placeholder="Max"
            value={value.kind === 'range' ? value.max : null}
            onChange={(v) =>
              debouncedCommit({
                kind: 'range',
                min: value.kind === 'range' ? value.min : null,
                max: typeof v === 'number' ? v : null,
              })
            }
          />
        </div>
      )}

      {uiKind === 'dateRange' && (
        <RangePicker
          size="small"
          value={
            value.kind === 'dateRange' && (value.from || value.to)
              ? [value.from ? dayjs(value.from) : null, value.to ? dayjs(value.to) : null]
              : null
          }
          onChange={(d) =>
            commit({
              kind: 'dateRange',
              from: d?.[0] ? d[0].toISOString() : null,
              to: d?.[1] ? d[1].toISOString() : null,
            })
          }
        />
      )}

      {uiKind === 'boolean' && (
        <Radio.Group
          size="small"
          value={
            value.kind === 'boolean'
              ? value.value == null
                ? 'any'
                : value.value
                  ? 'yes'
                  : 'no'
              : 'any'
          }
          onChange={(e) => {
            const v = e.target.value as 'any' | 'yes' | 'no';
            commit(v === 'any' ? null : { kind: 'boolean', value: v === 'yes' });
          }}
        >
          <Radio value="any">Any</Radio>
          <Radio value="yes">Yes</Radio>
          <Radio value="no">No</Radio>
        </Radio.Group>
      )}

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
          className="rounded-lg bg-primary-8 px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-9"
          onClick={() => hidePopupRef.current?.()}
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
        size="small"
        allowClear
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
                  onChange={(e) => toggle(o.value, e.target.checked)}
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
