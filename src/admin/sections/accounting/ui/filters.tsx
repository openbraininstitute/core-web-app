'use client';

import { DatePicker, Segmented, Select, Tag } from 'antd';
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';

import { DAY_FORMAT, parseDay } from '../../../shared/day';
import { shallow } from '../../virtual-lab/ui/list-filters';
import { dayBounds } from '../helpers';
import { EnabledFilter } from '../types';

import type { TAccountingFilter, TEnabledFilter } from '../types';

const ENABLED_OPTIONS = [
  { value: EnabledFilter.Any, label: 'Any' },
  { value: EnabledFilter.Enabled, label: 'Enabled' },
  { value: EnabledFilter.Disabled, label: 'Disabled' },
];

export function useEnabledFilter() {
  const [enabled, setEnabled] = useQueryState(
    'enabled',
    parseAsStringLiteral(Object.values(EnabledFilter))
      .withDefault(EnabledFilter.Any)
      .withOptions(shallow)
  );

  return {
    enabled: enabled === EnabledFilter.Any ? undefined : enabled === EnabledFilter.Enabled,
    control: (
      <Segmented
        value={enabled}
        options={ENABLED_OPTIONS}
        onChange={(value) => setEnabled(value as TEnabledFilter)}
      />
    ),
  };
}

export function useDayRange() {
  const [from, setFrom] = useQueryState('from', parseAsString.withDefault('').withOptions(shallow));
  const [to, setTo] = useQueryState('to', parseAsString.withDefault('').withOptions(shallow));

  return {
    bounds: dayBounds(from, to),
    control: (
      <DatePicker.RangePicker
        value={[parseDay(from), parseDay(to)]}
        onChange={(dates) => {
          setFrom(dates?.[0]?.format(DAY_FORMAT) ?? '');
          setTo(dates?.[1]?.format(DAY_FORMAT) ?? '');
        }}
      />
    ),
  };
}

/** An id filter set by a link from another page, shown as a removable tag. */
export function useIdFilter(key: TAccountingFilter, label: string) {
  const [id, setId] = useQueryState(key, parseAsString.withDefault('').withOptions(shallow));

  return {
    id: id || undefined,
    control: id ? (
      <Tag key={key} closable onClose={() => setId('')} className="m-0! py-1!">
        {label}: <span className="font-mono">{id.slice(0, 8)}…</span>
      </Tag>
    ) : null,
  };
}

export function useOptionFilter<T extends string>({
  key,
  placeholder,
  options,
  width = 'w-56!',
}: {
  key: string;
  placeholder: string;
  options: Array<{ value: T; label: string }>;
  width?: string;
}) {
  const [value, setValue] = useQueryState(
    key,
    parseAsStringLiteral(options.map((option) => option.value)).withOptions(shallow)
  );

  return {
    value: value ?? undefined,
    control: (
      <Select<T>
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder={placeholder}
        value={value ?? undefined}
        options={options}
        onChange={(next) => setValue(next ?? null)}
        className={width}
      />
    ),
  };
}
