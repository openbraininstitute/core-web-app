'use client';

import { adminQueryKeys } from '../../../query-keys';
import { formatDateTime } from '../../../shared/format';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { StatusPill } from '../../../shared/status-pill';
import { AdminLink } from '../../../shell/admin-link';
import { CapabilityGate } from '../../../shell/capability-gate';
import { listDiscounts } from '../api';
import { DISCOUNT_STATUSES, discountStatus, fractionToPercent } from '../helpers';
import { AccountingFilter } from '../types';
import { DiscountActions, NewDiscountButton } from './discount-actions';
import { useIdFilter } from './filters';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TDiscount, TDiscountFilters } from '../types';

const DISCOUNTS_SOURCE = pagedSource(listDiscounts);

function DiscountStatusPill({ discount }: { discount: TDiscount }) {
  const { label, tone } = DISCOUNT_STATUSES[discountStatus(discount)];
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

const COLUMNS: Array<ISimpleColumn<TDiscount>> = [
  {
    id: 'vlab_id',
    header: 'Lab',
    width: { width: 120 },
    renderCell: (discount) => <AdminLink kind="account" id={discount.vlab_id} />,
  },
  {
    id: 'discount',
    header: 'Discount',
    width: { width: 110 },
    getValue: (discount) => `${fractionToPercent(discount.discount)}%`,
  },
  {
    id: 'status',
    header: 'Status',
    width: { width: 120 },
    renderCell: (discount) => <DiscountStatusPill discount={discount} />,
  },
  {
    id: 'valid_from',
    header: 'Starts',
    width: { width: 170 },
    getValue: (discount) => formatDateTime(discount.valid_from),
  },
  {
    id: 'valid_to',
    header: 'Ends',
    width: { width: 170 },
    getValue: (discount) => (discount.valid_to ? formatDateTime(discount.valid_to) : 'No end'),
  },
  {
    id: 'actions',
    header: '',
    width: { flex: 1, minWidth: 200 },
    renderCell: (discount) => (
      <CapabilityGate need="accounting.write">
        <DiscountActions discount={discount} />
      </CapabilityGate>
    ),
  },
];

export function DiscountsList() {
  const lab = useIdFilter(AccountingFilter.Vlab, 'Lab');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Discounts"
        actions={
          lab.id && (
            <CapabilityGate need="accounting.write">
              <NewDiscountButton vlabId={lab.id} />
            </CapabilityGate>
          )
        }
      >
        The share of each charge a lab doesn't pay, newest first. Only the discount that started
        last applies. To add one, open the lab's account and its discounts.
      </PageHeader>
      {lab.control && <div className="flex flex-wrap items-center gap-3">{lab.control}</div>}
      <AdminPagedGrid<TDiscount>
        fill
        what="discounts"
        columns={COLUMNS}
        getRowId={(discount) =>
          `${discount.id}:${discountStatus(discount)}:${discount.discount}:${discount.valid_from}:${discount.valid_to}`
        }
        dataSource={DISCOUNTS_SOURCE}
        queryKey={adminQueryKeys.accountingDiscounts()}
        params={{ vlab_id: lab.id } satisfies TDiscountFilters}
      />
    </div>
  );
}
