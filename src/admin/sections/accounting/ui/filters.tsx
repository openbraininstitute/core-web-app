'use client';

import { DatePicker, Select, Tag } from 'antd';
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';

import { DAY_FORMAT, dayBounds, parseDay } from '../helpers';

const SHALLOW = { shallow: true };

export function useDayRange() {
  const [from, setFrom] = useQueryState('from', parseAsString.withDefault('').withOptions(SHALLOW));
  const [to, setTo] = useQueryState('to', parseAsString.withDefault('').withOptions(SHALLOW));

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
export function useIdFilter(key: string, label: string) {
  const [id, setId] = useQueryState(key, parseAsString.withDefault('').withOptions(SHALLOW));

  return {
    id: id || undefined,
    control: id ? (
      <Tag closable onClose={() => setId('')} className="m-0! py-1!">
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
    parseAsStringLiteral(options.map((option) => option.value)).withOptions(SHALLOW)
  );

  return {
    value: value ?? undefined,
    control: (
      <Select<T>
        allowClear
        showSearch
        placeholder={placeholder}
        value={value ?? undefined}
        options={options}
        onChange={(next) => setValue(next ?? null)}
        className={width}
      />
    ),
  };
}
