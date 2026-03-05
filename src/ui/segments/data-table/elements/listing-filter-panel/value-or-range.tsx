'use client';

import { type ChangeEvent, type HTMLProps, useState } from 'react';

import { RangeIcon } from '@/components/icons';
import { getFieldDefinition } from '@/entity-configuration/definitions';

import type { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import type { GteLteValue, ValueOrRangeFilter } from '@/entity-configuration/definitions/types';

export function getFieldUnit(field: EntityCoreFields) {
  const fieldDef = getFieldDefinition(field);
  return fieldDef?.unit;
}

function Radio({
  checked,
  children,
  id,
  label,
  onChange,
  value,
}: HTMLProps<HTMLInputElement> & { label: string }) {
  return (
    <div className="flex flex-col gap-2 text-white">
      <label className="cursor-pointer" htmlFor={id}>
        <span className="flex gap-2">
          <input
            checked={checked}
            className="cursor-pointer"
            id={id}
            onChange={onChange}
            type="radio"
            value={value}
          />
          <span className="text-white capitalize">{label}</span>
        </span>
      </label>
      {children}
    </div>
  );
}

const RadioOptionsDict = {
  all: 'all',
  value: 'value',
  range: 'range',
} as const;
type TRadioOption = (typeof RadioOptionsDict)[keyof typeof RadioOptionsDict];

function getInitialState(filterValue: ValueOrRangeFilter['value']) {
  if (typeof filterValue === 'number') {
    return { radio: RadioOptionsDict.value, value: String(filterValue), gte: '', lte: '' };
  }
  if (filterValue && typeof filterValue === 'object') {
    return {
      radio: RadioOptionsDict.range,
      value: '',
      gte: filterValue.gte != null ? String(filterValue.gte) : '',
      lte: filterValue.lte != null ? String(filterValue.lte) : '',
    };
  }
  return { radio: RadioOptionsDict.all as TRadioOption, value: '', gte: '', lte: '' };
}

export function ValueOrRange({
  filter,
  setFilter,
}: {
  filter: ValueOrRangeFilter;
  setFilter: (value: ValueOrRangeFilter['value']) => void;
}) {
  const [state, setState] = useState(() => getInitialState(filter.value));

  function handleRadio(radio: TRadioOption) {
    setState((s) => ({ ...s, radio }));
    if (radio === RadioOptionsDict.all) setFilter(null);
  }

  function handleValue(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setState((s) => ({ ...s, value: v }));
    setFilter(v.trim() === '' ? null : Number(v));
  }

  function handleRange(key: 'gte' | 'lte', e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setState((s) => {
      const newState = { ...s, [key]: v };
      const gteVal = key === 'gte' ? v : s.gte;
      const lteVal = key === 'lte' ? v : s.lte;
      setFilter({
        gte: gteVal.trim() === '' ? null : Number(gteVal),
        lte: lteVal.trim() === '' ? null : Number(lteVal),
      } as GteLteValue);
      return newState;
    });
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <Radio
        checked={state.radio === RadioOptionsDict.all}
        label="All"
        onChange={() => handleRadio(RadioOptionsDict.all)}
        value="all"
      />
      <Radio
        checked={state.radio === RadioOptionsDict.value}
        label="Value"
        onChange={() => handleRadio(RadioOptionsDict.value)}
        value="value"
      >
        <div className="flex items-center justify-between gap-2">
          <input
            type="number"
            className=" flex grow gap-2 rounded-md focus-visible:border! border-primary-4 bg-white text-primary-9 px-2 py-2 text-sm font-bold! focus-visible:outline-0"
            onChange={handleValue}
            value={state.value}
          />
          <span>{getFieldUnit(filter.field)}</span>
        </div>
      </Radio>
      <Radio
        checked={state.radio === RadioOptionsDict.range}
        label="Range"
        onChange={() => handleRadio(RadioOptionsDict.range)}
        value="range"
      >
        <div className="flex items-center gap-2 text-sm">
          <input
            className=" min-w-0 rounded-md focus-visible:border! border-primary-4 bg-white text-primary-9 px-2 py-2 text-center font-bold! focus-visible:outline-0"
            onChange={(e) => handleRange('gte', e)}
            step={1}
            type="number"
            value={state.gte}
          />
          <RangeIcon className="shrink-0" />
          <input
            className=" min-w-0 rounded-md focus-visible:border! border-primary-4 bg-white text-primary-9 px-2 py-2 text-center font-bold! focus-visible:outline-0"
            onChange={(e) => handleRange('lte', e)}
            step={1}
            type="number"
            value={state.lte}
          />
          <span className="shrink-0">{getFieldUnit(filter.field)}</span>
        </div>
      </Radio>
    </fieldset>
  );
}

export default ValueOrRange;
