'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { ADMIN_ROOT } from '../../../routes';
import { Detail, DetailId, DetailList } from '../../../shared/detail-list';
import { FormModal } from '../../../shared/form-modal';
import { formatDateTime } from '../../../shared/format';
import { AdminRowsGrid } from '../../../shared/grid';
import { Loaded } from '../../../shared/load-state';
import { PageHeader } from '../../../shared/page-header';
import { StatusPill } from '../../../shared/status-pill';
import { useAdminWrite } from '../../../shared/use-admin-write';
import { AdminLink } from '../../../shell/admin-link';
import { deactivatePromotion, getPromotion, getPromotionUsage } from '../api/admin';
import { PromotionEdit } from './promotion-form';
import { PromotionStatus, promotionUses } from './promotion-status';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TStatusTone } from '../../../shared/status-pill';
import type { AdminPromotion, AdminPromotionRedemption } from '../api/admin-types';

const REDEMPTION_TONES: Record<string, TStatusTone> = {
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

function PromotionUsage({ promotionId }: { promotionId: string }) {
  const query = useQuery({
    queryKey: adminQueryKeys.promotionUsage(promotionId),
    queryFn: ({ signal }) => getPromotionUsage(promotionId, signal),
  });

  return (
    <Loaded query={query} what="this code's usage">
      {({ statistics: stats, recent_redemptions: redemptions }) => (
        <>
          <DetailList>
            <Detail label="Redemptions">
              {`${stats.total_redemptions}: ${stats.completed} completed, ${stats.pending} pending, ${stats.failed} failed`}
            </Detail>
            <Detail label="Credits given">{stats.total_credits_distributed}</Detail>
            <Detail label="Users">{stats.unique_users}</Detail>
            <Detail label="Virtual labs">{stats.unique_virtual_labs}</Detail>
          </DetailList>
          <h2 className="text-primary-9 font-semibold">
            {redemptions.length < stats.total_redemptions
              ? `Latest ${redemptions.length} of ${stats.total_redemptions} redemptions`
              : 'Redemptions'}
          </h2>
          <AdminRowsGrid<AdminPromotionRedemption>
            what="redemptions"
            columns={REDEMPTION_COLUMNS}
            rows={redemptions}
            getRowId={({ id, status }) => `${id}:${status}`}
          />
        </>
      )}
    </Loaded>
  );
}

function PromotionActions({ promotion }: { promotion: AdminPromotion }) {
  const [open, setOpen] = useState<'edit' | 'deactivate' | null>(null);
  const close = () => setOpen(null);
  const deactivateWrite = useAdminWrite({
    write: () => deactivatePromotion(promotion.id),
    done: 'Promotion deactivated',
    failed: "Couldn't deactivate the promotion",
    onSuccess: close,
    refreshes: adminQueryKeys.promotions(),
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
          title="Deactivate this promotion?"
          description={`Redeeming ${promotion.code} skips this promotion after this. Other active promotions with the code still pay. Credits already given stay. You can turn it back on with Edit.`}
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

export function PromotionDetail({ promotionId }: { promotionId: string }) {
  const query = useQuery({
    queryKey: adminQueryKeys.promotion(promotionId),
    queryFn: ({ signal }) => getPromotion(promotionId, signal),
  });

  // The usage sits outside `Loaded`, so its request starts with the promotion's.
  return (
    <div className="flex flex-col gap-4">
      <Loaded query={query} what="this promotion">
        {(promotion) => (
          <>
            <PageHeader
              title={promotion.code}
              parent={{ label: 'Promotions', href: `${ADMIN_ROOT}/promotions` }}
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
              <Detail label="Uses per user and lab">
                {promotion.max_uses_per_user_per_period}
              </Detail>
              <Detail label="Uses in total">{promotionUses(promotion)}</Detail>
              <Detail label="Valid from">{formatDateTime(promotion.valid_from)}</Detail>
              <Detail label="Valid until">{formatDateTime(promotion.valid_until)}</Detail>
              <Detail label="Created by">
                <AdminLink kind="user" id={promotion.created_by} />
              </Detail>
              <Detail label="Created">{formatDateTime(promotion.created_at)}</Detail>
              <Detail label="Updated">{formatDateTime(promotion.updated_at)}</Detail>
            </DetailList>
          </>
        )}
      </Loaded>
      <h2 className="text-primary-9 font-semibold">Usage</h2>
      <PromotionUsage promotionId={promotionId} />
    </div>
  );
}
