'use client';

import { DatePicker, Segmented } from 'antd';
import dayjs from 'dayjs';
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';

import { PageHeader } from '../../../shared/page-header';
import { PaymentsGrid } from './billing';
import { useListFilters } from './list-filters';

import type { Dayjs } from 'dayjs';

const TYPES = ['any', 'subscription', 'standalone'] as const;
const TYPE_OPTIONS = [
  { value: 'any', label: 'Any type' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'standalone', label: 'Standalone' },
];

const DATE_FORMAT = 'YYYY-MM-DD';
const shallow = { shallow: true };

// The payment date column has no time zone, and the API answers 500 to a date with an offset.
const naiveUtc = (date: Dayjs) => date.toISOString().slice(0, -1);

export function PaymentsList() {
  const { params, gridKey, controls } = useListFilters();
  const [type, setType] = useQueryState(
    'type',
    parseAsStringLiteral(TYPES).withDefault('any').withOptions(shallow)
  );
  const [from, setFrom] = useQueryState('from', parseAsString.withDefault('').withOptions(shallow));
  const [to, setTo] = useQueryState('to', parseAsString.withDefault('').withOptions(shallow));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Payments" />
      {controls(
        'Search by the last 4 digits of the card',
        <>
          <Segmented
            value={type}
            options={TYPE_OPTIONS}
            onChange={(value) => setType(value as (typeof TYPES)[number])}
          />
          <DatePicker.RangePicker
            value={[from ? dayjs(from) : null, to ? dayjs(to) : null]}
            onChange={(dates) => {
              setFrom(dates?.[0]?.format(DATE_FORMAT) ?? '');
              setTo(dates?.[1]?.format(DATE_FORMAT) ?? '');
            }}
          />
        </>
      )}
      <PaymentsGrid
        key={`${gridKey}:${type}:${from}:${to}`}
        acrossOwners
        params={{
          card_last4: params.query,
          payment_type: type === 'any' ? undefined : type,
          start_date: from ? naiveUtc(dayjs(from).startOf('day')) : undefined,
          end_date: to ? naiveUtc(dayjs(to).endOf('day')) : undefined,
        }}
      />
    </div>
  );
}
