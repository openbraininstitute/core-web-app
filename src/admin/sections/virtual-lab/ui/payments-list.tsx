'use client';

import { DatePicker, Segmented } from 'antd';
import dayjs from 'dayjs';
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';

import { PageHeader } from '../../../shared/page-header';
import { PaymentsGrid } from './billing';
import { shallow, useListFilters } from './list-filters';

import type { Dayjs } from 'dayjs';
import type { PaymentFilters } from '../api/admin-types';

const TYPES = ['any', 'subscription', 'standalone'] as const;
type PaymentTypeFilter = (typeof TYPES)[number];
const TYPE_OPTIONS = [
  { value: 'any', label: 'Any type' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'standalone', label: 'Standalone' },
];

const DATE_FORMAT = 'YYYY-MM-DD';

// The dates come from the URL, so a mangled link is ignored rather than sent. dayjs rolls an
// impossible date such as month 13 over into a real one, so it has to format back unchanged.
function parseDay(value: string) {
  const day = dayjs(value);
  return day.isValid() && day.format(DATE_FORMAT) === value ? day : null;
}

// The payment date column has no time zone, and the API fails on a date with an offset.
const naiveUtc = (date: Dayjs) => date.toISOString().slice(0, -1);

export function paymentFilters({
  card,
  type,
  from,
  to,
}: {
  card?: string;
  type: PaymentTypeFilter;
  from: string;
  to: string;
}): PaymentFilters {
  const fromDay = parseDay(from);
  const toDay = parseDay(to);
  return {
    card_last4: card,
    payment_type: type === 'any' ? undefined : type,
    start_date: fromDay ? naiveUtc(fromDay.startOf('day')) : undefined,
    end_date: toDay ? naiveUtc(toDay.endOf('day')) : undefined,
  };
}

export function PaymentsList() {
  const [type, setType] = useQueryState(
    'type',
    parseAsStringLiteral(TYPES).withDefault('any').withOptions(shallow)
  );
  const [from, setFrom] = useQueryState('from', parseAsString.withDefault('').withOptions(shallow));
  const [to, setTo] = useQueryState('to', parseAsString.withDefault('').withOptions(shallow));
  const { params, controls } = useListFilters({ placeholder: 'Last 4 digits of the card' });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Payments" />
      <div className="flex flex-wrap items-center gap-3">
        {controls}
        <Segmented
          value={type}
          options={TYPE_OPTIONS}
          onChange={(value) => setType(value as PaymentTypeFilter)}
        />
        <DatePicker.RangePicker
          value={[parseDay(from), parseDay(to)]}
          onChange={(dates) => {
            setFrom(dates?.[0]?.format(DATE_FORMAT) ?? '');
            setTo(dates?.[1]?.format(DATE_FORMAT) ?? '');
          }}
        />
      </div>
      <PaymentsGrid acrossOwners params={paymentFilters({ card: params.query, type, from, to })} />
    </div>
  );
}
