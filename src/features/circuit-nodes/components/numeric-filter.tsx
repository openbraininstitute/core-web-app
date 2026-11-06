import { useGridFilter } from 'ag-grid-react';
import { Input, InputNumber, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { useDebouncedCallback } from '@/hooks/hooks';
import { fullscreenPopupContainer } from '@/utils/fullscreen';

import type { CustomFilterProps } from 'ag-grid-react';
import type { GetRef, InputNumber as InputNumberType, InputRef } from 'antd';
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

function isNumber(value: string): boolean {
  return value.trim() !== '' && Number.isFinite(Number(value));
}

/** The numbers typed for Equals, which matches any of them; anything else typed is left out. */
function listed(value: string): string[] {
  return value.split(/[\s,;]+/).filter(isNumber);
}

function toModel(op: NumberFilterOp, value: string, valueTo: string): NumberFilter | null {
  if (op === 'equals') {
    const values = listed(value);
    return values.length > 0 ? { filterType: 'number', type: op, filter: values.join(', ') } : null;
  }
  if (!isNumber(value)) return null;
  if (op === 'inRange') {
    if (!isNumber(valueTo)) return null;
    return { filterType: 'number', type: op, filter: value.trim(), filterTo: valueTo.trim() };
  }
  return { filterType: 'number', type: op, filter: value.trim() };
}

export function NumericFilter({ model, onModelChange }: Params) {
  const [op, setOp] = useState<NumberFilterOp>(model?.type ?? 'equals');
  const [value, setValue] = useState<string>(model?.filter ?? '');
  const [valueTo, setValueTo] = useState<string>(model?.filterTo ?? '');

  useEffect(() => {
    setOp(model?.type ?? 'equals');
    setValue(model?.filter ?? '');
    setValueTo(model?.filterTo ?? '');
  }, [model]);

  const hidePopupRef = useRef<(() => void) | null>(null);
  const valueInputRef = useRef<GetRef<typeof InputNumberType>>(null);
  const listInputRef = useRef<InputRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const getPopupContainer = () => containerRef.current ?? fullscreenPopupContainer();
  useGridFilter({
    doesFilterPass: () => true,
    afterGuiAttached: (params) => {
      hidePopupRef.current = params?.hidePopup ?? null;
      (listInputRef.current ?? valueInputRef.current)?.focus();
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
    // Only Equals takes several values; the others keep the first.
    const kept = next === 'equals' ? value : (listed(value)[0] ?? '');
    setOp(next);
    setValue(kept);
    commit(next, kept, valueTo);
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
        {op === 'equals' ? (
          <Input
            ref={listInputRef}
            size="small"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            onPressEnter={onPressEnter}
            placeholder="Values, e.g. 3, 7"
            title="Separate values with commas or spaces: a row matching any of them is kept"
          />
        ) : (
          <InputNumber
            ref={valueInputRef}
            size="small"
            controls={false}
            stringMode
            value={value === '' ? null : value}
            onChange={(v) => onValueChange(v === null || v === undefined ? '' : String(v))}
            onPressEnter={onPressEnter}
            placeholder="Value"
            style={{ width: '100%' }}
          />
        )}
        {op === 'inRange' && (
          <>
            <span className={popover.rangeLabel}>to</span>
            <InputNumber
              size="small"
              controls={false}
              stringMode
              value={valueTo === '' ? null : valueTo}
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
