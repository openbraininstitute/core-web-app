'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { Detail, DetailId, DetailList } from '../../../shared/detail-list';
import { FormModal } from '../../../shared/form-modal';
import { formatDateTime } from '../../../shared/format';
import { AdminRowsGrid, LoadFailure } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { adminQueryKeys } from '../../../shared/query-keys';
import { StatusPill } from '../../../shared/status-pill';
import { AdminLink } from '../../../shell/admin-link';
import { deactivatePromotion, getPromotion, getPromotionUsage } from '../api/promotions';
import { PromotionEdit } from './promotion-form';
import { PROMOTIONS_HREF, PromotionStatus } from './promotions-list';
import { useBillingWrite } from './use-billing-write';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { AdminPromotion, AdminPromotionRedemption } from '../api/admin-types';

const REDEMPTION_TONES: Record<string, 'good' | 'bad' | 'neutral'> = {
  completed: 'good',
  failed: 'bad',
};

const REDEMPTION_COLUMNS: Array<ISimpleColumn<AdminPromotionRedemption>> = [
  {
    id: 'user',
    header: 'User',
    width: { width: 140 },
    renderCell: (redemption) => <AdminLink kind="user" id={redemption.user_id} />,
  },
  {
    id: 'lab',
    header: 'Virtual lab',
    width: { flex: 2, minWidth: 220 },
    renderCell: (redemption) => (
      <AdminLink
        kind="vlab"
        id={redemption.virtual_lab_id}
        label={redemption.virtual_lab_name ?? undefined}
      />
    ),
  },
  {
    id: 'credits',
    header: 'Credits',
    width: { width: 110 },
    getValue: (redemption) => redemption.credits_granted,
  },
  {
    id: 'status',
    header: 'Status',
    width: { width: 130 },
    renderCell: ({ status }) => (
      <StatusPill tone={REDEMPTION_TONES[status] ?? 'neutral'}>{status}</StatusPill>
    ),
  },
  {
    id: 'error',
    header: 'Error',
    width: { flex: 2, minWidth: 200 },
    getValue: (redemption) => redemption.error_message,
  },
  {
    id: 'redeemed',
    header: 'Redeemed',
    width: { flex: 1, minWidth: 180 },
    getValue: (redemption) => formatDateTime(redemption.redeemed_at),
  },
];

function PromotionUsage({ id }: { id: string }) {
  const { data: usage, error } = useQuery({
    queryKey: adminQueryKeys.promotionUsage({ id }),
    queryFn: () => getPromotionUsage(id),
  });

  if (!usage) {
    return error ? (
      <LoadFailure error={error} what="this code's usage" />
    ) : (
      <p className="text-neutral-4">Loading this code's usage</p>
    );
  }

  const { statistics: stats, recent_redemptions: redemptions } = usage;

  return (
    <>
      <DetailList>
        <Detail label="Redemptions">
          {`${stats.total_redemptions}: ${stats.completed} completed, ${stats.pending} pending, ${stats.failed} failed`}
        </Detail>
        <Detail label="Credits given">{stats.total_credits_distributed}</Detail>
        <Detail label="Users">{stats.unique_users}</Detail>
        <Detail label="Virtual labs">{stats.unique_virtual_labs}</Detail>
      </DetailList>
      <h2 className="text-primary-9 font-semibold">Latest redemptions</h2>
      <AdminRowsGrid<AdminPromotionRedemption>
        what="redemptions"
        columns={REDEMPTION_COLUMNS}
        rows={redemptions}
        getRowId={({ id: rowId, status }) => `${rowId}:${status}`}
      />
    </>
  );
}

function PromotionActions({ promotion }: { promotion: AdminPromotion }) {
  const [open, setOpen] = useState<'edit' | 'deactivate' | null>(null);
  const close = () => setOpen(null);
  const deactivateWrite = useBillingWrite({
    write: () => deactivatePromotion(promotion.id),
    done: 'Promotion deactivated',
    failed: "Couldn't deactivate the promotion",
    onSuccess: close,
  });

  return (
    <>
      <Button rounded variant="outline" size="sm" onClick={() => setOpen('edit')}>
        Edit
      </Button>
      {promotion.active && (
        <Button rounded variant="outline" size="sm" onClick={() => setOpen('deactivate')}>
          Deactivate
        </Button>
      )}
      {open === 'edit' && <PromotionEdit promotion={promotion} onClose={close} />}
      {open === 'deactivate' && (
        <FormModal
          title={`Deactivate ${promotion.code}?`}
          description="Nobody can redeem it after this. Credits already given stay. You can turn it back on with Edit."
          fields={[]}
          okText="Deactivate"
          danger
          pending={deactivateWrite.isPending}
          onSubmit={() => deactivateWrite.mutate(undefined)}
          onClose={close}
        />
      )}
    </>
  );
}

export function PromotionDetail({ id }: { id: string }) {
  const { data: promotion, error } = useQuery({
    queryKey: adminQueryKeys.promotion({ id }),
    queryFn: () => getPromotion(id),
  });

  if (!promotion) {
    return error ? (
      <LoadFailure error={error} what="this promotion" />
    ) : (
      <p className="text-neutral-4">Loading this promotion</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={promotion.code}
        parent={{ label: 'Promotions', href: PROMOTIONS_HREF }}
        actions={<PromotionActions promotion={promotion} />}
      />
      <DetailList>
        <Detail label="Status">
          <PromotionStatus promotion={promotion} />
        </Detail>
        <Detail label="Description">{promotion.description}</Detail>
        <Detail label="Promotion ID">
          <DetailId>{promotion.id}</DetailId>
        </Detail>
        <Detail label="Credits granted">{promotion.credits_amount}</Detail>
        <Detail label="Period">{`${promotion.validity_period_days} days`}</Detail>
        <Detail label="Uses per user per period">{promotion.max_uses_per_user_per_period}</Detail>
        <Detail label="Uses in total">
          {promotion.max_total_uses === null
            ? `${promotion.current_total_uses}, no limit`
            : `${promotion.current_total_uses} of ${promotion.max_total_uses}`}
        </Detail>
        <Detail label="Valid from">{formatDateTime(promotion.valid_from)}</Detail>
        <Detail label="Valid until">{formatDateTime(promotion.valid_until)}</Detail>
        <Detail label="Created by">
          <AdminLink kind="user" id={promotion.created_by} />
        </Detail>
        <Detail label="Created">{formatDateTime(promotion.created_at)}</Detail>
        <Detail label="Updated">{formatDateTime(promotion.updated_at)}</Detail>
      </DetailList>
      <h2 className="text-primary-9 font-semibold">Usage</h2>
      <PromotionUsage id={id} />
    </div>
  );
}
