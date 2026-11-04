'use client';

import dayjs from 'dayjs';

import { changedFields } from '../../../shared/changed-fields';
import { FormModal } from '../../../shared/form-modal';
import { asUtc } from '../../../shared/format';
import { createPromotion, updatePromotion } from '../api/promotions';
import { useBillingWrite } from './use-billing-write';

import type { Dayjs } from 'dayjs';
import type { AdminPromotion, AdminPromotionUpdate } from '../api/admin-types';

const REQUIRED = [{ required: true, message: 'Required' }];

export function PromotionCreate({ onClose }: { onClose: () => void }) {
  const write = useBillingWrite({
    write: createPromotion,
    done: 'Promotion created',
    failed: "Couldn't create the promotion",
    onSuccess: onClose,
  });

  return (
    <FormModal<{
      code: string;
      description?: string;
      credits_amount: number;
      validity_period_days: number;
      max_uses_per_user_per_period: number;
      max_total_uses?: number | null;
      active: boolean;
      valid_from: Dayjs;
      valid_until: Dayjs;
    }>
      title="Create a promotion code"
      description="Once active, anyone with the code can redeem it for credits inside its dates."
      fields={[
        {
          name: 'code',
          label: 'Code',
          extra: 'Stored in capitals. The same code can be reused with different dates.',
          rules: [...REQUIRED, { min: 3, max: 50, message: 'Between 3 and 50 characters' }],
        },
        { name: 'description', label: 'Description', kind: 'multiline', rules: [{ max: 1000 }] },
        {
          name: 'credits_amount',
          label: 'Credits granted',
          kind: 'integer',
          min: 1,
          rules: REQUIRED,
        },
        {
          name: 'validity_period_days',
          label: 'Period in days',
          kind: 'integer',
          min: 1,
          extra: 'The limit per user counts over this period.',
          rules: REQUIRED,
        },
        {
          name: 'max_uses_per_user_per_period',
          label: 'Uses per user per period',
          kind: 'integer',
          min: 1,
          rules: REQUIRED,
        },
        {
          name: 'max_total_uses',
          label: 'Uses in total',
          kind: 'integer',
          min: 1,
          placeholder: 'No limit',
          extra: "Once set, this can be changed but not removed. Can't be below the uses per user.",
          rules: [
            ({ getFieldValue }) => ({
              validator: async (_, value) => {
                if (value && value < getFieldValue('max_uses_per_user_per_period')) {
                  throw new Error("Can't be below the uses per user");
                }
              },
            }),
          ],
        },
        { name: 'valid_from', label: 'Valid from', kind: 'datetime', rules: REQUIRED },
        {
          name: 'valid_until',
          label: 'Valid until',
          kind: 'datetime',
          rules: [
            ...REQUIRED,
            ({ getFieldValue }) => ({
              validator: async (_, value?: Dayjs) => {
                const from: Dayjs | undefined = getFieldValue('valid_from');
                if (value && from && !value.isAfter(from)) {
                  throw new Error('Has to be after the start');
                }
              },
            }),
          ],
        },
        { name: 'active', label: 'Active', kind: 'switch' },
      ]}
      initialValues={{ active: true, max_uses_per_user_per_period: 1 }}
      okText="Create"
      pending={write.isPending}
      onSubmit={({
        description,
        max_total_uses: maxTotal,
        valid_from: from,
        valid_until: until,
        ...rest
      }) =>
        write.mutate({
          ...rest,
          description: description || undefined,
          max_total_uses: maxTotal ?? undefined,
          valid_from: from.toISOString(),
          valid_until: until.toISOString(),
        })
      }
      onClose={onClose}
    />
  );
}

export function PromotionEdit({
  promotion,
  onClose,
}: {
  promotion: AdminPromotion;
  onClose: () => void;
}) {
  const write = useBillingWrite({
    write: (update: AdminPromotionUpdate) => updatePromotion(promotion.id, update),
    done: 'Promotion updated',
    failed: "Couldn't update the promotion",
    onSuccess: onClose,
  });
  const validUntil = dayjs(asUtc(promotion.valid_until));
  const hasLimit = promotion.max_total_uses !== null;

  return (
    <FormModal<{
      description: string | null;
      active: boolean;
      valid_until: Dayjs;
      max_total_uses: number | null;
    }>
      title={`Edit ${promotion.code}`}
      description="The code, its credits, its period and its start can't be changed after creation."
      fields={[
        { name: 'description', label: 'Description', kind: 'multiline', rules: [{ max: 1000 }] },
        {
          name: 'valid_until',
          label: 'Valid until',
          kind: 'datetime',
          rules: [
            ...REQUIRED,
            {
              validator: async (_, value?: Dayjs) => {
                if (value && !value.isAfter(dayjs(asUtc(promotion.valid_from)))) {
                  throw new Error('Has to be after the start');
                }
              },
            },
          ],
        },
        {
          name: 'max_total_uses',
          label: 'Uses in total',
          kind: 'integer',
          min: 1,
          placeholder: 'No limit',
          extra: hasLimit ? 'This can be changed, but the API has no way to remove it.' : undefined,
          rules: [
            ...(hasLimit ? [{ required: true, message: 'Give a limit' }] : []),
            {
              validator: async (_, value) => {
                if (value && value < promotion.max_uses_per_user_per_period) {
                  throw new Error("Can't be below the uses per user");
                }
              },
            },
          ],
        },
        { name: 'active', label: 'Active', kind: 'switch' },
      ]}
      initialValues={{
        description: promotion.description,
        valid_until: validUntil,
        max_total_uses: promotion.max_total_uses,
        active: promotion.active,
      }}
      okText="Save"
      pending={write.isPending}
      onSubmit={({ description, valid_until: until, max_total_uses: maxTotal, active }) => {
        const update = changedFields<AdminPromotionUpdate>(
          {
            description: description ?? undefined,
            active,
            valid_until: until.isSame(validUntil) ? promotion.valid_until : until.toISOString(),
            max_total_uses: maxTotal ?? undefined,
          },
          promotion
        );
        if (Object.keys(update).length) write.mutate(update);
        else onClose();
      }}
      onClose={onClose}
    />
  );
}
