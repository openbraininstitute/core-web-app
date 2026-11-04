'use client';

import { Select } from 'antd';
import { parseAsString, useQueryState } from 'nuqs';

import { PageHeader } from '../../../shared/page-header';
import { SubscriptionsGrid } from './billing';

const STATUSES = [
  'active',
  'past_due',
  'unpaid',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'paused',
].map((value) => ({ value, label: value.replace('_', ' ') }));

export function SubscriptionsList() {
  const [status, setStatus] = useQueryState(
    'status',
    parseAsString.withDefault('').withOptions({ shallow: true })
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Subscriptions" />
      <Select
        allowClear
        placeholder="Any status"
        value={status || undefined}
        options={STATUSES}
        onChange={(value) => setStatus(value ?? '')}
        className="w-56"
      />
      <SubscriptionsGrid key={status} acrossOwners params={{ status: status || undefined }} />
    </div>
  );
}
