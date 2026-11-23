'use client';

import { Segmented } from 'antd';
import { useRouter } from 'next/navigation';
import { parseAsBoolean, useQueryState } from 'nuqs';

import { adminQueryKeys } from '../../../query-keys';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { AdminLink, adminHref } from '../../../shell/admin-link';
import { CapabilityGate } from '../../../shell/capability-gate';
import { shallow } from '../../virtual-lab/ui/list-filters';
import { listPrices } from '../api';
import {
  SERVICE_TYPE_LABELS,
  SERVICE_TYPE_OPTIONS,
  SUBTYPE_OPTIONS,
  tierSummary,
  windowStatus,
} from '../helpers';
import { AccountingFilter, PriceScope } from '../types';
import { WindowStatusPill } from './cells';
import { validityColumns } from './columns';
import { useIdFilter, useOptionFilter } from './filters';
import { NewPriceButton } from './price-actions';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TPrice, TPriceFilters } from '../types';

const PRICES_SOURCE = pagedSource(listPrices);

const SCOPE_OPTIONS = [
  { value: PriceScope.All, label: 'All' },
  { value: PriceScope.Default, label: 'Defaults only' },
];

const COLUMNS: Array<ISimpleColumn<TPrice>> = [
  {
    id: 'price',
    header: 'Price',
    width: { flex: 2, minWidth: 240 },
    renderCell: (price) => (
      <span className="flex min-w-0 flex-col">
        <span className="text-primary-9 truncate font-semibold">{price.service_subtype}</span>
        <span className="text-neutral-4 truncate text-sm">
          #{price.id} · {SERVICE_TYPE_LABELS[price.service_type]}
        </span>
      </span>
    ),
  },
  {
    id: 'vlab_id',
    header: 'Applies to',
    width: { width: 130 },
    renderCell: (price) =>
      price.vlab_id ? <AdminLink kind="account" id={price.vlab_id} /> : 'Default',
  },
  {
    id: 'status',
    header: 'Status',
    width: { width: 120 },
    renderCell: (price) => <WindowStatusPill window={price} />,
  },
  ...validityColumns<TPrice>(),
  {
    id: 'tiers',
    header: 'Rate',
    width: { flex: 1, minWidth: 200 },
    getValue: tierSummary,
  },
];

export function PricesList() {
  const router = useRouter();
  const lab = useIdFilter(AccountingFilter.Vlab, 'Lab');
  const type = useOptionFilter({
    key: 'type',
    placeholder: 'Any type',
    options: SERVICE_TYPE_OPTIONS,
  });
  const subtype = useOptionFilter({
    key: 'subtype',
    placeholder: 'Any subtype',
    options: SUBTYPE_OPTIONS,
    width: 'w-72!',
  });
  const [defaultsOnly, setDefaultsOnly] = useQueryState(
    'defaults',
    parseAsBoolean.withDefault(false).withOptions(shallow)
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Prices"
        actions={
          <CapabilityGate need="accounting.write">
            <NewPriceButton vlabId={lab.id} />
          </CapabilityGate>
        }
      >
        What each service costs, newest first. A lab's own price wins over the default, and among
        prices in their dates the one that started last applies. Accounting can't delete a price: a
        new one replaces it.
      </PageHeader>
      <div className="flex flex-wrap items-center gap-3">
        {lab.control}
        {type.control}
        {subtype.control}
        {!lab.id && (
          <Segmented
            value={defaultsOnly ? PriceScope.Default : PriceScope.All}
            options={SCOPE_OPTIONS}
            onChange={(value) => setDefaultsOnly(value === PriceScope.Default)}
          />
        )}
      </div>
      <AdminPagedGrid<TPrice>
        fill
        what="prices"
        columns={COLUMNS}
        getRowId={(price) => `${price.id}:${windowStatus(price)}:${price.updated_at}`}
        dataSource={PRICES_SOURCE}
        queryKey={adminQueryKeys.accountingPrices()}
        params={
          {
            vlab_id: lab.id,
            service_type: type.value,
            service_subtype: subtype.value,
            only_default: !lab.id && defaultsOnly ? true : undefined,
          } satisfies TPriceFilters
        }
        onRowClick={(price) => router.push(adminHref('accountingPrice', String(price.id)))}
      />
    </div>
  );
}
