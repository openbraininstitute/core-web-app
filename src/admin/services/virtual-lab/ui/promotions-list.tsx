'use client';

import { useQuery } from '@tanstack/react-query';
import { Segmented } from 'antd';
import { useRouter } from 'next/navigation';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { asUtc, formatDateTime } from '../../../shared/format';
import { AdminPagedGrid } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { adminQueryKeys } from '../../../shared/query-keys';
import { StatusPill } from '../../../shared/status-pill';
import { ADMIN_ROOT } from '../../../shell/sections';
import { getPromotionAnalytics, listPromotions } from '../api/promotions';
import { useListFilters } from './list-filters';
import { PromotionCreate } from './promotion-form';

import type { IGridDataSource } from '@/features/data-grid/core';
import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminPromotion } from '../api/admin-types';

export const PROMOTIONS_HREF = `${ADMIN_ROOT}/promotions`;

const STATUSES = ['any', 'active', 'inactive'] as const;
const STATUS_OPTIONS = [
  { value: 'any', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const PROMOTIONS_SOURCE: IGridDataSource<AdminPromotion> = {
  fetch: async ({ page, pageSize, params }) => {
    const { promotions, pagination } = await listPromotions({
      ...params,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return { rows: promotions, total: pagination.total };
  },
};

// The API's `active` only says it wasn't switched off: the code may still be past its dates.
export function PromotionStatus({ promotion }: { promotion: AdminPromotion }) {
  if (!promotion.active) return <StatusPill tone="neutral">Inactive</StatusPill>;
  if (new Date(asUtc(promotion.valid_until)) < new Date()) {
    return <StatusPill tone="warn">Expired</StatusPill>;
  }
  return <StatusPill tone="good">Active</StatusPill>;
}

const COLUMNS: Array<ISimpleColumn<AdminPromotion>> = [
  {
    id: 'code',
    header: 'Code',
    width: { flex: 1, minWidth: 180 },
    renderCell: ({ code }) => (
      <span className="text-primary-9 font-mono font-semibold">{code}</span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    width: { width: 120 },
    renderCell: (promotion) => <PromotionStatus promotion={promotion} />,
  },
  {
    id: 'description',
    header: 'Description',
    width: { flex: 2, minWidth: 220 },
    getValue: (promotion) => promotion.description,
  },
  {
    id: 'credits',
    header: 'Credits',
    width: { width: 110 },
    getValue: (promotion) => promotion.credits_amount,
  },
  {
    id: 'uses',
    header: 'Uses',
    width: { width: 130 },
    getValue: ({ current_total_uses: used, max_total_uses: max }) =>
      max === null ? `${used}, no limit` : `${used} of ${max}`,
  },
  {
    id: 'valid',
    header: 'Valid',
    width: { flex: 2, minWidth: 340 },
    getValue: (promotion) =>
      `${formatDateTime(promotion.valid_from)} to ${formatDateTime(promotion.valid_until)}`,
  },
];

export function PromotionsList() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const { params, gridKey, controls } = useListFilters();
  const [status, setStatus] = useQueryState(
    'status',
    parseAsStringLiteral(STATUSES).withDefault('any').withOptions({ shallow: true })
  );
  const { data: analytics } = useQuery({
    queryKey: adminQueryKeys.promotionAnalytics(),
    queryFn: getPromotionAnalytics,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Promotions"
        actions={
          <Button rounded variant="outline" size="sm" onClick={() => setCreating(true)}>
            Create promotion
          </Button>
        }
      >
        {analytics &&
          `Codes: ${analytics.total_promotions}, of which expired: ${analytics.expired_promotions}. Redemptions: ${analytics.total_redemptions}. Credits given: ${analytics.total_credits_distributed}.`}
      </PageHeader>
      {controls(
        'Search by code or description',
        <Segmented
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => setStatus(value as (typeof STATUSES)[number])}
        />
      )}
      <AdminPagedGrid<AdminPromotion>
        key={`${gridKey}:${status}`}
        fill
        what="promotions"
        columns={COLUMNS}
        getRowId={({ id, active, code }) => `${id}:${active}:${code}`}
        dataSource={PROMOTIONS_SOURCE}
        queryKey={adminQueryKeys.promotions()}
        params={{
          search: params.query,
          active: status === 'any' ? undefined : status === 'active',
        }}
        onRowClick={(promotion) => router.push(`${PROMOTIONS_HREF}/${promotion.id}`)}
      />
      {creating && <PromotionCreate onClose={() => setCreating(false)} />}
    </div>
  );
}
