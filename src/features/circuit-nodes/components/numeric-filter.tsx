import { useGridFilter } from 'ag-grid-react';
import { InputNumber, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { useDebouncedCallback } from '@/hooks/hooks';

import type { CustomFilterProps } from 'ag-grid-react';
import type { GetRef, InputNumber as InputNumberType } from 'antd';
import type { NumberFilter, NumberFilterOp } from '@/features/circuit-nodes/types';

import popover from './filter-popover.module.css';

const APPLY_DEBOUNCE_MS = 150;

const OPERATOR_OPTIONS: { value: NumberFilterOp; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEqual', label: 'Not equal' },
  { value: 'lessThan', label: 'Less than' },
  { value: 'lessThanOrEqual', label: 'Less than or equal' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'greaterThanOrEqual', label: 'Greater than or equal' },
  { value: 'inRange', label: 'In range' },
];

type Params = CustomFilterProps<unknown, unknown, NumberFilter | null>;

function toModel(op: NumberFilterOp, value: string, valueTo: string): NumberFilter | null {
  const n = Number(value);
  if (value.trim() === '' || !Number.isFinite(n)) return null;
  if (op === 'inRange') {
    const m = Number(valueTo);
    if (valueTo.trim() === '' || !Number.isFinite(m)) return null;
    return { filterType: 'number', type: op, filter: n, filterTo: m };
  }
  return { filterType: 'number', type: op, filter: n };
}

export function NumericFilter({ model, onModelChange }: Params) {
  const [op, setOp] = useState<NumberFilterOp>(model?.type ?? 'equals');
  const [value, setValue] = useState<string>(
    model?.filter !== undefined ? String(model.filter) : ''
  );
  const [valueTo, setValueTo] = useState<string>(
    model?.filterTo !== undefined ? String(model.filterTo) : ''
  );

  useEffect(() => {
    setOp(model?.type ?? 'equals');
    setValue(model?.filter !== undefined ? String(model.filter) : '');
    setValueTo(model?.filterTo !== undefined ? String(model.filterTo) : '');
  }, [model]);

  const hidePopupRef = useRef<(() => void) | null>(null);
  const valueInputRef = useRef<GetRef<typeof InputNumberType>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const getPopupContainer = () =>
    containerRef.current ?? (document.fullscreenElement as HTMLElement | null) ?? document.body;
  useGridFilter({
    doesFilterPass: () => true,
    afterGuiAttached: (params) => {
      hidePopupRef.current = params?.hidePopup ?? null;
      valueInputRef.current?.focus();
    },
  });

  const commit = useDebouncedCallback(
    (nextOp: NumberFilterOp, nextValue: string, nextValueTo: string) => {
      onModelChange(toModel(nextOp, nextValue, nextValueTo));
    },
    [onModelChange],
    APPLY_DEBOUNCE_MS
  );

  useEffect(() => () => commit.cancel(), [commit]);

  const applyImmediate = (nextOp: NumberFilterOp, nextValue: string, nextValueTo: string) => {
    commit.cancel();
    onModelChange(toModel(nextOp, nextValue, nextValueTo));
  };

  const onOpChange = (next: NumberFilterOp) => {
    setOp(next);
    commit(next, value, valueTo);
  };

  const onValueChange = (next: string) => {
    setValue(next);
    commit(op, next, valueTo);
  };

  const onValueToChange = (next: string) => {
    setValueTo(next);
    commit(op, value, next);
  };

  const reset = () => {
    commit.cancel();
    setOp('equals');
    setValue('');
    setValueTo('');
    onModelChange(null);
  };

  const onPressEnter = () => {
    applyImmediate(op, value, valueTo);
    hidePopupRef.current?.();
  };

  return (
    <div ref={containerRef} className={popover.popover}>
      <Select<NumberFilterOp>
        size="small"
        value={op}
        onChange={onOpChange}
        options={OPERATOR_OPTIONS}
        getPopupContainer={getPopupContainer}
      />
      <div className={popover.row}>
        <InputNumber
          ref={valueInputRef}
          size="small"
          controls={false}
          value={value === '' ? null : Number(value)}
          onChange={(v) => onValueChange(v === null || v === undefined ? '' : String(v))}
          onPressEnter={onPressEnter}
          placeholder="Value"
          style={{ width: '100%' }}
        />
        {op === 'inRange' && (
          <>
            <span className={popover.rangeLabel}>to</span>
            <InputNumber
              size="small"
              controls={false}
              value={valueTo === '' ? null : Number(valueTo)}
              onChange={(v) => onValueToChange(v === null || v === undefined ? '' : String(v))}
              onPressEnter={onPressEnter}
              placeholder="Value"
              style={{ width: '100%' }}
            />
          </>
        )}
      </div>
      <div className={popover.footer}>
        <button type="button" onClick={reset} className={popover.actionButton}>
          Reset
        </button>
      </div>
    </div>
  );
}
