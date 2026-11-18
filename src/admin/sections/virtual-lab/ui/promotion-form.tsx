'use client';

import dayjs from 'dayjs';

import { adminQueryKeys } from '../../../query-keys';
import { saveChanges } from '../../../shared/changed-fields';
import { DESCRIPTION_FIELD, FormModal } from '../../../shared/form-modal';
import { useAdminWrite } from '../../../shared/use-admin-write';
import { createPromotion, updatePromotion } from '../api/admin';

import type { Rule } from 'antd/es/form';
import type {
  AdminPromotion,
  AdminPromotionCreate,
  AdminPromotionUpdate,
} from '../api/admin-types';

const REQUIRED = [{ required: true, message: 'Required' }];

const DESCRIPTION = { ...DESCRIPTION_FIELD, rules: [{ max: 1000 }] };

const atLeastPerUser =
  (perUser: (field: (name: string) => unknown) => unknown): Rule =>
  ({ getFieldValue }) => ({
    validator: async (_, value?: number) => {
      if (value && value < Number(perUser(getFieldValue)))
        throw new Error("Can't be below the uses per user");
    },
  });

const afterStart =
  (start: (field: (name: string) => unknown) => unknown): Rule =>
  ({ getFieldValue }) => ({
    validator: async (_, value?: string) => {
      const from = start(getFieldValue) as string | undefined;
      if (value && from && !dayjs(value).isAfter(from)) {
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
    <FormModal<Omit<AdminPromotionCreate, 'max_total_uses'> & { max_total_uses?: number | null }>
      title="Create a promotion code"
      description="Once active, anyone with the code can redeem it for credits inside its dates."
      fields={[
        {
          name: 'code',
          label: 'Code',
          extra: 'Stored in capitals. The same code can be reused with different dates.',
          rules: [...REQUIRED, { min: 3, max: 50, message: 'Between 3 and 50 characters' }],
        },
        DESCRIPTION,
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
          rules: [atLeastPerUser((field) => field('max_uses_per_user_per_period'))],
        },
        { name: 'valid_from', label: 'Valid from', kind: 'datetime', rules: REQUIRED },
        {
          name: 'valid_until',
          label: 'Valid until',
          kind: 'datetime',
          rules: [...REQUIRED, afterStart((field) => field('valid_from'))],
        },
        { name: 'active', label: 'Active', kind: 'switch' },
      ]}
      initialValues={{ active: true, max_uses_per_user_per_period: 1 }}
      okText="Create"
      pending={write.isPending}
      onSubmit={({ description, max_total_uses: maxTotal, ...rest }) =>
        write.mutate({
          ...rest,
          description: description || undefined,
          max_total_uses: maxTotal ?? undefined,
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
      description="The code, its credits, its period and its start can't be changed after creation."
      fields={[
        DESCRIPTION,
        {
          name: 'valid_until',
          label: 'Valid until',
          kind: 'datetime',
          rules: [...REQUIRED, afterStart(() => promotion.valid_from)],
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
            atLeastPerUser(() => promotion.max_uses_per_user_per_period),
          ],
        },
        { name: 'active', label: 'Active', kind: 'switch' },
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
