'use client';

import { useQuery } from '@tanstack/react-query';

import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { createDiscount, deleteDiscount, listDiscounts, updateDiscount } from '../api';
import {
  discountStatus,
  discountSummary,
  discountUpdate,
  endField,
  fractionToPercent,
  percentField,
  percentToFraction,
  startField,
} from '../helpers';
import { DiscountStatus } from '../types';
import { ActionButton } from './action-button';
import { useAccount } from './queries';

import type { TDiscount, TDiscountValues } from '../types';

const LAB_DISCOUNTS = { page: 1, page_size: 100 };
const NOT_ADDED_UP = "Discounts don't add up: at any time, the one that started last applies.";

function newDiscountDescription(current: TDiscount[]) {
  if (!current.length) return 'Takes this share off every charge to the lab while it runs.';
  return (
    <>
      <p>This lab already has:</p>
      <ul className="my-2 list-disc pl-5">
        {current.map((discount) => (
          <li key={discount.id}>{discountSummary(discount)}</li>
        ))}
      </ul>
      <p>{NOT_ADDED_UP}</p>
    </>
  );
}

export function NewDiscountButton({ vlabId }: { vlabId: string }) {
  const account = useAccount(vlabId);
  const discounts = useQuery({
    queryKey: adminQueryKeys.accountingLabDiscounts(vlabId),
    queryFn: ({ signal }) => listDiscounts({ vlab_id: vlabId, ...LAB_DISCOUNTS }, signal),
  });
  if (account.isPending || discounts.isPending) {
    return (
      <Button rounded variant="outline" size="sm" disabled>
        New discount
      </Button>
    );
  }
  if (account.isError || discounts.isError) {
    return <span className="text-destructive text-sm">Couldn't load the lab's discounts</span>;
  }
  const current = discounts.data.data.filter(
    (discount) => discountStatus(discount) !== DiscountStatus.Expired
  );

  return (
    <ActionButton<TDiscountValues, TDiscount | null>
      action={{
        label: 'New discount',
        title: `New discount for ${account.data.name}`,
        description: newDiscountDescription(current),
        fields: [percentField(), startField(false), endField()],
        okText: 'Add discount',
        buttonVariant: 'outline',
        write: ({ percent, valid_from: from, valid_to: to }) =>
          createDiscount({
            vlab_id: vlabId,
            discount: percentToFraction(percent),
            valid_from: from ?? new Date().toISOString(),
            ...(to && { valid_to: to }),
          }),
        done: 'Discount added',
        failed: "Couldn't add the discount",
      }}
    />
  );
}

export function DiscountActions({ discount }: { discount: TDiscount }) {
  const status = discountStatus(discount);
  if (status === DiscountStatus.Expired) return null;
  const scheduled = status === DiscountStatus.Scheduled;

  return (
    <span className="flex items-center gap-2">
      <ActionButton<Partial<TDiscountValues>, TDiscount | null>
        action={{
          label: scheduled ? 'Edit' : 'Change end',
          title: scheduled ? 'Edit the discount' : 'Change when the discount ends',
          description: scheduled
            ? "It hasn't started, so everything can still change."
            : 'It has started, so only its end can change. It applies to the next charge of jobs already running.',
          fields: scheduled
            ? [
                percentField(fractionToPercent(discount.discount)),
                startField(true, discount.valid_from),
                endField(),
              ]
            : [endField(discount.valid_from)],
          initialValues: {
            ...(scheduled && {
              percent: fractionToPercent(discount.discount),
              valid_from: discount.valid_from,
            }),
            valid_to: discount.valid_to ?? undefined,
          },
          okText: 'Save',
          write: async (values) => {
            const update = discountUpdate(discount, values);
            return Object.keys(update).length ? updateDiscount(discount.id, update) : null;
          },
          done: (result) => (result ? 'Discount saved' : 'Nothing changed'),
          failed: "Couldn't save the discount",
        }}
      />
      {scheduled && (
        <ActionButton<Record<string, never>, null>
          action={{
            label: 'Delete',
            title: 'Delete this discount?',
            description: `${discountSummary(discount)}. It hasn't started, so no charge used it.`,
            okText: 'Delete',
            danger: true,
            buttonVariant: 'outline',
            write: () => deleteDiscount(discount.id),
            done: 'Discount deleted',
            failed: "Couldn't delete the discount",
          }}
        />
      )}
    </span>
  );
}
