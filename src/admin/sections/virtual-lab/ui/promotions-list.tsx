'use client';

import { useQuery } from '@tanstack/react-query';
import { Segmented } from 'antd';
import { useRouter } from 'next/navigation';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { ADMIN_ROOT } from '../../../routes';
import { asUtc, formatDateTime } from '../../../shared/format';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { StatusPill } from '../../../shared/status-pill';
import { adminHref } from '../../../shell/admin-link';
import { getPromotionAnalytics, listPromotions } from '../api/admin';
import { shallow, useListFilters } from './list-filters';
import { PromotionCreate } from './promotion-form';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminPromotion } from '../api/admin-types';

export const PROMOTIONS_HREF = `${ADMIN_ROOT}/promotions`;

const STATUSES = ['any', 'active', 'inactive'] as const;
const STATUS_OPTIONS = [
  { value: 'any', label: 'Any status' },
  { value: 'active', label: 'Switched on' },
  { value: 'inactive', label: 'Switched off' },
];

const PROMOTIONS_SOURCE = pagedSource(listPromotions);

// The API's `active` only says it wasn't switched off: the code may be outside its dates.
export function PromotionStatus({ promotion }: { promotion: AdminPromotion }) {
  const now = new Date();

  if (!promotion.active) return <StatusPill tone="neutral">Switched off</StatusPill>;
  if (new Date(asUtc(promotion.valid_until)) < now) {
    return <StatusPill tone="warn">Expired</StatusPill>;
  }
  if (new Date(asUtc(promotion.valid_from)) > now) {
    return <StatusPill tone="neutral">Scheduled</StatusPill>;
  }
  return <StatusPill tone="good">Active</StatusPill>;
}

export const promotionUses = ({ current_total_uses: used, max_total_uses: max }: AdminPromotion) =>
  max === null ? `${used}, no limit` : `${used} of ${max}`;

const COLUMNS: Array<ISimpleColumn<AdminPromotion>> = [
  {
    id: 'code',
    header: 'Code',
    width: { flex: 1, minWidth: 180 },
    getValue: (promotion) => promotion.code,
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
  { id: 'uses', header: 'Uses', width: { width: 130 }, getValue: promotionUses },
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
  const { params, controls } = useListFilters({ placeholder: 'Search by code or description' });
  const [status, setStatus] = useQueryState(
    'status',
    parseAsStringLiteral(STATUSES).withDefault('any').withOptions(shallow)
  );
  const { data: analytics } = useQuery({
    queryKey: adminQueryKeys.promotionAnalytics(),
    queryFn: ({ signal }) => getPromotionAnalytics(signal),
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
      <div className="flex flex-wrap items-center gap-3">
        {controls}
        <Segmented
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => setStatus(value as (typeof STATUSES)[number])}
        />
      </div>
      <AdminPagedGrid<AdminPromotion>
        fill
        what="promotions"
        columns={COLUMNS}
        // `status` is a rendered cell, so a row whose state changed has to be a new row.
        getRowId={({ id, updated_at: updatedAt }) => `${id}:${updatedAt}`}
        dataSource={PROMOTIONS_SOURCE}
        queryKey={adminQueryKeys.promotionList()}
        params={{
          search: params.query,
          active: status === 'any' ? undefined : status === 'active',
        }}
        onRowClick={(promotion) => router.push(adminHref('promotion', promotion.id))}
      />
      {creating && <PromotionCreate onClose={() => setCreating(false)} />}
    </div>
  );
}
