'use client';

import { adminQueryKeys } from '../../../query-keys';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { AdminLink } from '../../../shell/admin-link';
import { CapabilityGate } from '../../../shell/capability-gate';
import { listDiscounts } from '../api';
import { fractionToPercent, windowStatus } from '../helpers';
import { AccountingFilter } from '../types';
import { WindowStatusPill } from './cells';
import { validityColumns } from './columns';
import { DiscountActions, NewDiscountButton } from './discount-actions';
import { useIdFilter } from './filters';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TDiscount, TDiscountFilters } from '../types';

const DISCOUNTS_SOURCE = pagedSource(listDiscounts);

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
    renderCell: (discount) => <WindowStatusPill window={discount} />,
  },
  ...validityColumns<TDiscount>(),
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
          `${discount.id}:${windowStatus(discount)}:${discount.discount}:${discount.valid_from}:${discount.valid_to}`
        }
        dataSource={DISCOUNTS_SOURCE}
        queryKey={adminQueryKeys.accountingDiscounts()}
        params={{ vlab_id: lab.id } satisfies TDiscountFilters}
      />
    </div>
  );
}
