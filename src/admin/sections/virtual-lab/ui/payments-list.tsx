'use client';

import { Segmented } from 'antd';
import { parseAsStringLiteral, useQueryState } from 'nuqs';

import { parseDay, useDayRange } from '../../../shared/day';
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

// The payment date column is naive UTC, and the API fails on a date with an offset. A picked
// local day goes out as its UTC bounds, the same day the grid shows in local time.
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

// The API matches the last 4 digits exactly, so anything shorter or not digits can't match.
export const isCardSearchable = (card?: string) => !card || /^\d{4}$/.test(card);

export function PaymentsList() {
  const [type, setType] = useQueryState(
    'type',
    parseAsStringLiteral(TYPES).withDefault('any').withOptions(shallow)
  );
  const range = useDayRange();
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
        {range.control}
      </div>
      {isCardSearchable(params.query) ? (
        <PaymentsGrid
          acrossOwners
          params={paymentFilters({ card: params.query, type, from: range.from, to: range.to })}
        />
      ) : (
        <p className="border-neutral-2 text-neutral-4 rounded-lg border bg-white p-5">
          Enter the last 4 digits of the card.
        </p>
      )}
    </div>
  );
}
