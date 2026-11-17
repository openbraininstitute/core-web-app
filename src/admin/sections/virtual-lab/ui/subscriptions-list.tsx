'use client';

import { Select } from 'antd';
import { parseAsStringLiteral, useQueryState } from 'nuqs';

import { PageHeader } from '../../../shared/page-header';
import { SubscriptionsGrid } from './billing';

// virtual-lab-api SubscriptionStatus
const STATUSES = [
  'active',
  'past_due',
  'unpaid',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'paused',
] as const;
const STATUS_OPTIONS = STATUSES.map((value) => ({ value, label: value.replaceAll('_', ' ') }));

export function SubscriptionsList() {
  const [status, setStatus] = useQueryState(
    'status',
    parseAsStringLiteral(STATUSES).withOptions({ shallow: true })
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Subscriptions" />
      <Select
        allowClear
        placeholder="Any status"
        value={status}
        options={STATUS_OPTIONS}
        onChange={(value) => setStatus(value ?? null)}
        className="w-56"
      />
      <SubscriptionsGrid key={status} acrossOwners params={{ status: status ?? undefined }} />
    </div>
  );
}
