'use client';

import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { FormModal } from '../../../shared/form-modal';
import { formatDateTime, formatMoney } from '../../../shared/format';
import { AdminPagedGrid, pagedSource, toPageParams } from '../../../shared/grid';
import { adminQueryKeys } from '../../../shared/query-keys';
import { StatusPill } from '../../../shared/status-pill';
import { AdminLink } from '../../../shell/admin-link';
import { CapabilityGate } from '../../../shell/capability-gate';
import { cancelSubscription, listPayments, listSubscriptions } from '../api/admin';
import { useTenancyWrite } from './use-tenancy-write';

import type { IGridDataSource } from '@/features/data-grid/core';
import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminPayment, AdminSubscription, BillingOwner } from '../api/admin-types';

const SUBSCRIPTIONS_SOURCE = pagedSource<AdminSubscription>(listSubscriptions);

const PAYMENTS_SOURCE: IGridDataSource<AdminPayment> = {
  fetch: async (query) => {
    const { payments, total_count: total } = await listPayments(toPageParams(query));
    return { rows: payments, total };
  },
};

const PAYMENT_COLUMNS: Array<ISimpleColumn<AdminPayment>> = [
  {
    id: 'date',
    header: 'Date',
    width: { flex: 1, minWidth: 180 },
    getValue: (payment) => formatDateTime(payment.payment_date),
  },
  {
    id: 'amount',
    header: 'Amount',
    width: { width: 140 },
    getValue: (payment) => formatMoney(payment.amount_paid, payment.currency),
  },
  {
    id: 'credits',
    header: 'Credits',
    width: { width: 110 },
    getValue: (payment) => payment.credits_purchased,
  },
  {
    id: 'type',
    header: 'Type',
    width: { width: 140 },
    getValue: (payment) => payment.payment_type,
  },
  {
    id: 'card',
    header: 'Card',
    width: { width: 150 },
    getValue: (payment) => `${payment.card_brand} ${payment.card_last4}`,
  },
  { id: 'status', header: 'Status', width: { width: 140 }, getValue: (payment) => payment.status },
  {
    id: 'receipt',
    header: 'Receipt',
    width: { width: 110 },
    renderCell: (payment) =>
      payment.receipt_url && (
        <a
          href={payment.receipt_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-9 hover:underline"
        >
          View
        </a>
      ),
  },
];

const PAYMENT_LAB_COLUMN: ISimpleColumn<AdminPayment> = {
  id: 'lab',
  header: 'Virtual lab',
  width: { width: 140 },
  renderCell: (payment) => <AdminLink kind="vlab" id={payment.virtual_lab_id} />,
};

const SUBSCRIPTION_OWNER_COLUMNS: Array<ISimpleColumn<AdminSubscription>> = [
  {
    id: 'lab',
    header: 'Virtual lab',
    width: { width: 140 },
    renderCell: (subscription) => <AdminLink kind="vlab" id={subscription.virtual_lab_id} />,
  },
  {
    id: 'user',
    header: 'User',
    width: { width: 140 },
    renderCell: (subscription) => <AdminLink kind="user" id={subscription.user_id} />,
  },
];

type BillingGridProps = {
  params: Record<string, unknown>;
  // A list across owners says whose each row is, and fills the page.
  acrossOwners?: boolean;
};

export function SubscriptionsGrid({ params, acrossOwners }: BillingGridProps) {
  const [cancelling, setCancelling] = useState<AdminSubscription | null>(null);
  const write = useTenancyWrite({
    write: ({ id, reason }: { id: string; reason: string }) => cancelSubscription(id, reason),
    done: 'Subscription set to cancel at the end of its period',
    failed: "Couldn't cancel the subscription",
    onSuccess: () => setCancelling(null),
  });

  const columns: Array<ISimpleColumn<AdminSubscription>> = [
    {
      id: 'status',
      header: 'Status',
      width: { width: 130 },
      renderCell: ({ status }) => (
        <StatusPill tone={status === 'active' ? 'good' : 'neutral'}>{status}</StatusPill>
      ),
    },
    { id: 'type', header: 'Type', width: { width: 100 }, getValue: (s) => s.type },
    { id: 'tier', header: 'Tier', width: { width: 110 }, getValue: (s) => s.tier },
    ...(acrossOwners ? SUBSCRIPTION_OWNER_COLUMNS : []),
    {
      id: 'period',
      header: 'Current period',
      width: { flex: 2, minWidth: 340 },
      // Free subscriptions never end, which the API stores as the year 9999.
      getValue: (s) =>
        s.current_period_end.startsWith('9999')
          ? `From ${formatDateTime(s.current_period_start)}, no end date`
          : `${formatDateTime(s.current_period_start)} to ${formatDateTime(s.current_period_end)}`,
    },
    {
      id: 'actions',
      header: '',
      width: { width: 170 },
      renderCell: (subscription) =>
        subscription.status === 'active' &&
        subscription.type !== 'FREE' && (
          <CapabilityGate need="virtualLab.admin">
            <Button rounded variant="outline" size="sm" onClick={() => setCancelling(subscription)}>
              Cancel at period end
            </Button>
          </CapabilityGate>
        ),
    },
  ];

  return (
    <>
      <AdminPagedGrid<AdminSubscription>
        fill={acrossOwners}
        what="subscriptions"
        columns={columns}
        getRowId={({ id, status }) => `${id}:${status}`}
        dataSource={SUBSCRIPTIONS_SOURCE}
        queryKey={adminQueryKeys.subscriptions()}
        params={params}
      />
      {cancelling && (
        <FormModal
          title="Cancel this subscription at the end of its period?"
          description={`It stays active until ${formatDateTime(cancelling.current_period_end)}, then doesn't renew.`}
          fields={[
            {
              name: 'reason',
              label: 'Reason',
              kind: 'multiline',
              rules: [{ required: true, message: 'Give a reason' }],
            },
          ]}
          okText="Cancel subscription"
          danger
          pending={write.isPending}
          onSubmit={({ reason }: { reason: string }) => write.mutate({ id: cancelling.id, reason })}
          onClose={() => setCancelling(null)}
        />
      )}
    </>
  );
}

export function PaymentsGrid({ params, acrossOwners }: BillingGridProps) {
  return (
    <AdminPagedGrid<AdminPayment>
      fill={acrossOwners}
      what="payments"
      columns={acrossOwners ? [PAYMENT_LAB_COLUMN, ...PAYMENT_COLUMNS] : PAYMENT_COLUMNS}
      getRowId={(payment) => payment.id}
      dataSource={PAYMENTS_SOURCE}
      queryKey={adminQueryKeys.payments()}
      params={params}
    />
  );
}

export function Billing({ owner }: { owner: BillingOwner }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-primary-9 font-semibold">Subscriptions</h2>
        <SubscriptionsGrid params={owner} />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-primary-9 font-semibold">Payments</h2>
        <PaymentsGrid params={owner} />
      </section>
    </div>
  );
}
