'use client';

import dayjs from 'dayjs';

import { adminQueryKeys } from '../../../query-keys';
import { saveChanges } from '../../../shared/changed-fields';
import { DESCRIPTION_FIELD, FormModal } from '../../../shared/form-modal';
import { useAdminWrite } from '../../../shared/use-admin-write';
import { createPromotion, updatePromotion } from '../api/admin';

import type { RuleObject } from 'antd/es/form';
import type {
  AdminPromotion,
  AdminPromotionCreate,
  AdminPromotionUpdate,
} from '../api/admin-types';

const REQUIRED = [{ required: true, message: 'Required' }];

const DESCRIPTION = { ...DESCRIPTION_FIELD, rules: [{ max: 1000 }] };

// A stored value is let through: the API doesn't check these, and saving skips it.
export const atLeast = (
  min: number | null | undefined,
  message: string,
  stored?: number | null
): RuleObject => ({
  validator: async (_, value?: number | null) => {
    if (value == null || min == null || value === stored) return;
    if (value < min) throw new Error(message);
  },
});

export const POSITIVE: RuleObject = { type: 'number', min: 1, message: 'Has to be at least 1' };

type PromotionCreateValues = Omit<
  AdminPromotionCreate,
  'max_total_uses' | 'validity_period_days'
> & { max_total_uses?: number | null };

// The API requires a period but never reads it, so it gets the code's dates.
export function promotionCreateBody({
  code,
  description,
  max_total_uses: maxTotal,
  ...rest
}: PromotionCreateValues): AdminPromotionCreate {
  const days = Math.ceil(dayjs(rest.valid_until).diff(rest.valid_from, 'day', true));
  return {
    ...rest,
    code: code.trim(),
    description: description || undefined,
    max_total_uses: maxTotal ?? undefined,
    validity_period_days: Math.max(1, days),
  };
}

const PER_USER = "Can't be below the uses per user";

const after = (start: string | undefined): RuleObject => ({
  validator: async (_, value?: string) => {
    if (value && start && !dayjs(value).isAfter(start)) {
      throw new Error('Has to be after the start');
    }
  },
});

export function PromotionCreate({ onClose }: { onClose: () => void }) {
  const write = useAdminWrite({
    write: createPromotion,
    done: 'Promotion created',
    failed: "Couldn't create the promotion",
    onSuccess: onClose,
    refreshes: adminQueryKeys.promotions(),
  });

  return (
    <FormModal<PromotionCreateValues>
      title="Create a promotion code"
      description="Once active, anyone with the code can redeem it for credits inside its dates."
      fields={[
        {
          name: 'code',
          label: 'Code',
          extra:
            'Stored in capitals. An existing code can be used again, but if two active promotions with it overlap, the one that started first pays, with its credits.',
          // The API trims the code only after checking its length.
          rules: [
            { required: true, whitespace: true, message: 'Required' },
            {
              min: 3,
              max: 50,
              transform: (value?: string) => value?.trim(),
              message: 'Between 3 and 50 characters',
            },
          ],
        },
        DESCRIPTION,
        {
          name: 'credits_amount',
          label: 'Credits granted',
          kind: 'integer',
          min: 1,
          rules: [...REQUIRED, POSITIVE],
        },
        {
          name: 'max_uses_per_user_per_period',
          label: 'Uses per user and lab',
          kind: 'integer',
          min: 1,
          extra: "Counted in each of the user's labs, over the code's dates.",
          rules: [...REQUIRED, POSITIVE],
        },
        {
          name: 'max_total_uses',
          label: 'Uses in total',
          kind: 'integer',
          min: 1,
          placeholder: 'No limit',
          extra: "Once set, this can be changed but not removed. Can't be below the uses per user.",
          dependencies: ['max_uses_per_user_per_period'],
          rules: [
            POSITIVE,
            ({ getFieldValue }) => atLeast(getFieldValue('max_uses_per_user_per_period'), PER_USER),
          ],
        },
        { name: 'valid_from', label: 'Valid from', kind: 'datetime', rules: REQUIRED },
        {
          name: 'valid_until',
          label: 'Valid until',
          kind: 'datetime',
          dependencies: ['valid_from'],
          rules: [...REQUIRED, ({ getFieldValue }) => after(getFieldValue('valid_from'))],
        },
        { name: 'active', label: 'Active', kind: 'switch' },
      ]}
      initialValues={{ active: true, max_uses_per_user_per_period: 1 }}
      okText="Create"
      pending={write.isPending}
      onSubmit={(values) => write.mutate(promotionCreateBody(values))}
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
  const write = useAdminWrite({
    write: (update: AdminPromotionUpdate) => updatePromotion(promotion.id, update),
    done: 'Promotion updated',
    failed: "Couldn't update the promotion",
    onSuccess: onClose,
    refreshes: adminQueryKeys.promotions(),
  });
  const hasLimit = promotion.max_total_uses !== null;

  return (
    <FormModal<Pick<AdminPromotion, 'description' | 'active' | 'valid_until' | 'max_total_uses'>>
      title={`Edit ${promotion.code}`}
      description="The code, its credits, its start and its uses per user can't be changed after creation."
      fields={[
        DESCRIPTION,
        {
          name: 'valid_until',
          label: 'Valid until',
          kind: 'datetime',
          rules: [...REQUIRED, after(promotion.valid_from)],
        },
        {
          name: 'max_total_uses',
          label: 'Uses in total',
          kind: 'integer',
          min: 1,
          placeholder: 'No limit',
          extra: hasLimit
            ? 'This can be changed, but the API has no way to remove it.'
            : 'Once set, this can be changed but not removed.',
          rules: [
            ...(hasLimit ? [{ required: true, message: 'Give a limit' }] : []),
            POSITIVE,
            atLeast(promotion.max_uses_per_user_per_period, PER_USER, promotion.max_total_uses),
            atLeast(
              promotion.current_total_uses,
              `Already used ${promotion.current_total_uses} times`,
              promotion.max_total_uses
            ),
          ],
        },
        {
          name: 'active',
          label: 'Active',
          kind: 'switch',
          extra: `Off, redeeming ${promotion.code} skips this promotion. Other active promotions with the code still pay.`,
        },
      ]}
      initialValues={promotion}
      okText="Save"
      pending={write.isPending}
      onSubmit={({ description, max_total_uses: maxTotal, ...rest }) =>
        saveChanges<AdminPromotionUpdate>(
          { ...rest, description: description ?? undefined, max_total_uses: maxTotal ?? undefined },
          promotion,
          write.mutate,
          onClose
        )
      }
      onClose={onClose}
    />
  );
}
