'use client';

import { useState } from 'react';

import { formatMinorCurrency } from '@/features/stripe/utils';
import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { AdminTabs } from '../../../shared/admin-tabs';
import { saveChanges } from '../../../shared/changed-fields';
import { DESCRIPTION_FIELD, FormModal, NAME_FIELD } from '../../../shared/form-modal';
import { AdminQueryGrid } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { StatusPill } from '../../../shared/status-pill';
import { useAdminWrite } from '../../../shared/use-admin-write';
import { CapabilityGate } from '../../../shell/capability-gate';
import { listCreditRates, listPlans, updateCreditRate, updatePlan } from '../api/admin';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminWriteOptions } from '../../../shared/use-admin-write';
import type {
  AdminCreditRate,
  AdminCreditRateUpdate,
  AdminPlan,
  AdminPlanUpdate,
} from '../api/admin-types';

const useBillingWrite = <Args,>(options: AdminWriteOptions<Args>) =>
  useAdminWrite({ ...options, refreshes: adminQueryKeys.billing() });

const DISCOUNT_WARNING =
  'Has to match the Stripe coupon: this changes the price customers are quoted, while the coupon sets what they are charged.';

function planPrice(plan: AdminPlan, amount: number, discount: number | null, credits: number) {
  const price = `${formatMinorCurrency(amount, plan.currency)}, ${credits} credits`;
  return discount ? `${price}, ${formatMinorCurrency(discount, plan.currency)} off` : price;
}

const creditBand = ({ min_credits: min, max_credits: max }: AdminCreditRate) =>
  max === null ? `${min} and above` : `${min} to ${max}`;

function ActiveStatus({ active }: { active: boolean }) {
  return (
    <StatusPill tone={active ? 'good' : 'neutral'}>{active ? 'Active' : 'Inactive'}</StatusPill>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <CapabilityGate need="virtualLab.admin">
      <Button rounded variant="outline" size="sm" onClick={onClick}>
        Edit
      </Button>
    </CapabilityGate>
  );
}

function PlanEdit({ plan, onClose }: { plan: AdminPlan; onClose: () => void }) {
  const write = useBillingWrite({
    write: (update: AdminPlanUpdate) => updatePlan(plan.id, update),
    done: 'Plan updated',
    failed: "Couldn't update the plan",
    onSuccess: onClose,
  });

  return (
    <FormModal<Required<AdminPlanUpdate>>
      title={`Edit ${plan.name}`}
      description="Applies to anyone choosing this plan from now on. Prices come from Stripe and can't be changed here."
      fields={[
        NAME_FIELD,
        DESCRIPTION_FIELD,
        { name: 'active', label: 'Active', kind: 'switch' },
        {
          name: 'monthly_credits',
          label: 'Monthly credits',
          kind: 'integer',
          min: 0,
          rules: [{ required: true, message: 'Give a number' }],
        },
        {
          name: 'yearly_credits',
          label: 'Yearly credits',
          kind: 'integer',
          min: 0,
          rules: [{ required: true, message: 'Give a number' }],
        },
        {
          name: 'monthly_discount',
          label: 'Monthly discount, in cents',
          kind: 'integer',
          min: 0,
          extra: DISCOUNT_WARNING,
        },
        {
          name: 'yearly_discount',
          label: 'Yearly discount, in cents',
          kind: 'integer',
          min: 0,
          extra: DISCOUNT_WARNING,
        },
      ]}
      initialValues={plan}
      okText="Save"
      pending={write.isPending}
      onSubmit={(values) => saveChanges(values, plan, write.mutate, onClose)}
      onClose={onClose}
    />
  );
}

function PlansTab() {
  const [editing, setEditing] = useState<AdminPlan | null>(null);

  const columns: Array<ISimpleColumn<AdminPlan>> = [
    {
      id: 'name',
      header: 'Plan',
      width: { flex: 2, minWidth: 220 },
      renderCell: (plan) => <span className="text-primary-9 font-semibold">{plan.name}</span>,
    },
    { id: 'tier', header: 'Tier', width: { width: 110 }, getValue: (plan) => plan.tier },
    {
      id: 'status',
      header: 'Status',
      width: { width: 120 },
      renderCell: (plan) => <ActiveStatus active={plan.active} />,
    },
    {
      id: 'monthly',
      header: 'Monthly',
      width: { flex: 1, minWidth: 300 },
      getValue: (plan) =>
        planPrice(plan, plan.monthly_amount, plan.monthly_discount, plan.monthly_credits),
    },
    {
      id: 'yearly',
      header: 'Yearly',
      width: { flex: 1, minWidth: 300 },
      getValue: (plan) =>
        planPrice(plan, plan.yearly_amount, plan.yearly_discount, plan.yearly_credits),
    },
    {
      id: 'actions',
      header: '',
      width: { width: 90 },
      renderCell: (plan) => <EditButton onClick={() => setEditing(plan)} />,
    },
  ];

  return (
    <>
      <AdminQueryGrid<AdminPlan>
        what="plans"
        columns={columns}
        getRowId={({ id, updated_at: updatedAt }) => `${id}:${updatedAt}`}
        queryKey={adminQueryKeys.plans()}
        queryFn={listPlans}
      />
      {editing && <PlanEdit plan={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function CreditRateEdit({ rate, onClose }: { rate: AdminCreditRate; onClose: () => void }) {
  const write = useBillingWrite({
    write: (update: AdminCreditRateUpdate) => updateCreditRate(rate.id, update),
    done: 'Credit rate updated',
    failed: "Couldn't update the credit rate",
    onSuccess: onClose,
  });

  return (
    <FormModal<Required<AdminCreditRateUpdate>>
      title={`Edit the ${rate.currency.toUpperCase()} rate for ${creditBand(rate)} credits`}
      description="Applies to credit purchases from now on. Only one active rate can start at a given amount."
      fields={[
        {
          name: 'rate',
          label: 'Rate',
          rules: [
            { required: true, message: 'Give a rate' },
            {
              validator: async (_, value) => {
                if (!/^\d+(\.\d+)?$/.test(value) || Number(value) <= 0) {
                  throw new Error('Enter a number above 0');
                }
              },
            },
          ],
        },
        {
          name: 'discount_pct',
          label: 'Discount %',
          kind: 'integer',
          min: 0,
          max: 100,
          rules: [{ required: true, message: 'Give a number from 0 to 100' }],
        },
        {
          name: 'max_credits',
          label: 'Up to credits',
          kind: 'integer',
          min: rate.min_credits,
          placeholder: 'No upper limit',
        },
        { name: 'active', label: 'Active', kind: 'switch' },
      ]}
      initialValues={rate}
      okText="Save"
      pending={write.isPending}
      onSubmit={(values) => saveChanges(values, rate, write.mutate, onClose)}
      onClose={onClose}
    />
  );
}

function CreditRatesTab() {
  const [editing, setEditing] = useState<AdminCreditRate | null>(null);

  const columns: Array<ISimpleColumn<AdminCreditRate>> = [
    {
      id: 'currency',
      header: 'Currency',
      width: { width: 120 },
      getValue: (rate) => rate.currency.toUpperCase(),
    },
    {
      id: 'band',
      header: 'Credits',
      width: { flex: 1, minWidth: 180 },
      getValue: creditBand,
    },
    {
      id: 'rate',
      header: 'Rate',
      width: { flex: 1, minWidth: 120 },
      getValue: (rate) => rate.rate,
    },
    {
      id: 'discount',
      header: 'Discount',
      width: { width: 120 },
      getValue: (rate) => `${rate.discount_pct}%`,
    },
    {
      id: 'status',
      header: 'Status',
      width: { width: 120 },
      renderCell: (rate) => <ActiveStatus active={rate.active} />,
    },
    {
      id: 'actions',
      header: '',
      width: { width: 90 },
      renderCell: (rate) => <EditButton onClick={() => setEditing(rate)} />,
    },
  ];

  return (
    <>
      <AdminQueryGrid<AdminCreditRate>
        what="credit rates"
        columns={columns}
        getRowId={({ id, updated_at: updatedAt }) => `${id}:${updatedAt}`}
        queryKey={adminQueryKeys.creditRates()}
        queryFn={listCreditRates}
      />
      {editing && <CreditRateEdit rate={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

export function PlansAndRates() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Plans and rates" />
      <AdminTabs
        tabs={[
          { key: 'plans', label: 'Plans', content: <PlansTab /> },
          { key: 'rates', label: 'Credit rates', content: <CreditRatesTab /> },
        ]}
      />
    </div>
  );
}
