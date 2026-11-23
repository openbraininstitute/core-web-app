'use client';

import { Button } from '@/ui/molecules/button';

import {
  assertPriceAfter,
  assertPriceEdit,
  createPrice,
  expirePrice,
  replacePrice,
  updatePrice,
} from '../api';
import { endField, priceValues, windowStatus } from '../helpers';
import { LEGACY_SUBTYPES } from '../schemas';
import { WindowStatus } from '../types';
import { ActionButton, DialogButton } from './action-button';
import { PriceDialog } from './price-dialog';
import { useAccount } from './queries';

import type { TPrice } from '../types';

export function NewPriceButton({ vlabId }: { vlabId?: string }) {
  const account = useAccount(vlabId);
  if (vlabId && !account.data) {
    return account.isError ? (
      <span className="text-destructive text-sm">Couldn't load the lab</span>
    ) : (
      <Button rounded variant="outline" size="sm" disabled>
        New price
      </Button>
    );
  }

  return (
    <DialogButton label={vlabId ? 'New price' : 'New default price'}>
      {(close) => (
        <PriceDialog<TPrice | null>
          title={account.data ? `New price for ${account.data.name}` : 'New default price'}
          vlabId={vlabId ?? null}
          okText="Add price"
          write={async (body) => {
            await assertPriceAfter(body, body.valid_to);
            return createPrice(body);
          }}
          done={(price) => (price ? `Price #${price.id} added` : 'Price added')}
          failed="Couldn't add the price"
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

function SetEndButton({ price }: { price: TPrice }) {
  return (
    <ActionButton<{ valid_to: string }, TPrice | null>
      action={{
        label: price.valid_to ? 'Change end' : 'Set end',
        title: `End price #${price.id}`,
        description:
          "Jobs reserved before the end keep this price. Accounting can't remove an end once it's set.",
        fields: [endField(price.valid_from, true)],
        initialValues: { valid_to: price.valid_to ?? undefined },
        okText: 'Set end',
        write: async ({ valid_to: end }) => {
          await assertPriceAfter(price, end, price.id);
          return expirePrice(price.id, { valid_to: end });
        },
        done: 'End set',
        failed: "Couldn't set the end",
      }}
    />
  );
}

export function PriceActions({ price }: { price: TPrice }) {
  const status = windowStatus(price);
  if (status === WindowStatus.Expired) return null;
  const values = priceValues(price);
  const legacy = LEGACY_SUBTYPES.includes(price.service_subtype);

  return (
    <span className="flex items-center gap-2">
      {!legacy &&
        (status === WindowStatus.Scheduled ? (
          <DialogButton label="Edit">
            {(close) => (
              <PriceDialog<TPrice | null>
                title={`Edit price #${price.id}`}
                vlabId={price.vlab_id}
                priceId={price.id}
                initialValues={values}
                keyLocked
                okText="Save"
                write={async (body) => {
                  await assertPriceEdit(price, body);
                  return updatePrice(price.id, body);
                }}
                done="Price saved"
                failed="Couldn't save the price"
                onClose={close}
              />
            )}
          </DialogButton>
        ) : (
          <DialogButton label="Change price">
            {(close) => (
              <PriceDialog<TPrice>
                title={`Replace price #${price.id}`}
                vlabId={price.vlab_id}
                priceId={price.id}
                initialValues={{ ...values, valid_from: undefined, valid_to: undefined }}
                keyLocked
                startAhead
                okText="Add and end the old one"
                write={(body) => replacePrice(price, body)}
                done={(created) => `Price #${created.id} added; #${price.id} ends when it starts`}
                failed="Couldn't replace the price"
                onClose={close}
              />
            )}
          </DialogButton>
        ))}
      <SetEndButton price={price} />
    </span>
  );
}
