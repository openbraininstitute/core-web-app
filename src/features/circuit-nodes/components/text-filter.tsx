import { RiSearchLine } from '@remixicon/react';
import { useGridFilter } from 'ag-grid-react';
import { Input, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { useDebouncedCallback } from '@/hooks/hooks';

import type { CustomFilterProps } from 'ag-grid-react';
import type { InputRef } from 'antd';
import type { TextFilter as TextFilterModel, TextFilterOp } from '@/features/circuit-nodes/types';

import popover from './filter-popover.module.css';

const APPLY_DEBOUNCE_MS = 150;

const OPERATOR_OPTIONS: { value: TextFilterOp; label: string }[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'notEqual', label: 'Not equal' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
];

type Params = CustomFilterProps<unknown, unknown, TextFilterModel | null>;

function toModel(op: TextFilterOp, value: string): TextFilterModel | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return { filterType: 'text', type: op, filter: trimmed };
}

export function TextFilter({ model, onModelChange }: Params) {
  const [op, setOp] = useState<TextFilterOp>(model?.type ?? 'contains');
  const [value, setValue] = useState<string>(model?.filter ?? '');

  useEffect(() => {
    setOp(model?.type ?? 'contains');
    setValue(model?.filter ?? '');
  }, [model]);

  const hidePopupRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<InputRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const getPopupContainer = () =>
    containerRef.current ?? (document.fullscreenElement as HTMLElement | null) ?? document.body;
  useGridFilter({
    doesFilterPass: () => true,
    afterGuiAttached: (params) => {
      hidePopupRef.current = params?.hidePopup ?? null;
      inputRef.current?.focus({ cursor: 'end' });
    },
  });

  const commit = useDebouncedCallback(
    (nextOp: TextFilterOp, nextValue: string) => {
      onModelChange(toModel(nextOp, nextValue));
    },
    [onModelChange],
    APPLY_DEBOUNCE_MS
  );

  useEffect(() => () => commit.cancel(), [commit]);

  const applyImmediate = (nextOp: TextFilterOp, nextValue: string) => {
    commit.cancel();
    onModelChange(toModel(nextOp, nextValue));
  };

  const onOpChange = (next: TextFilterOp) => {
    setOp(next);
    commit(next, value);
  };

  const onValueChange = (next: string) => {
    setValue(next);
    commit(op, next);
  };

  const reset = () => {
    commit.cancel();
    setOp('contains');
    setValue('');
    onModelChange(null);
  };

  return (
    <div ref={containerRef} className={popover.popover}>
      <Select<TextFilterOp>
        size="small"
        value={op}
        onChange={onOpChange}
        options={OPERATOR_OPTIONS}
        getPopupContainer={getPopupContainer}
      />
      <Input
        ref={inputRef}
        prefix={<RiSearchLine size={14} />}
        placeholder="Filter…"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onPressEnter={() => {
          applyImmediate(op, value);
          hidePopupRef.current?.();
        }}
        allowClear
        size="small"
      />
      <div className={popover.footer}>
        <button type="button" onClick={reset} className={popover.actionButton}>
          Reset
        </button>
      </div>
    </div>
  );
}
