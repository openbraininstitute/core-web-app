'use client';

import { ApiError } from '@/api/error';
import { Button } from '@/ui/molecules/button';

import {
  assertPriceEdit,
  assertPriceEnd,
  createPrice,
  expirePrice,
  replacePrice,
  updatePrice,
} from '../api';
import { endField, isPartlyDone, priceValues, windowStatus } from '../helpers';
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
          write={createPrice}
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
          await assertPriceEnd(price, end);
          return expirePrice(price.id, { valid_to: end });
        },
        done: 'End set',
        failed: "Couldn't set the end",
      }}
    />
  );
}

function EditPriceButton({ price }: { price: TPrice }) {
  return (
    <DialogButton label="Edit">
      {(close) => (
        <PriceDialog<TPrice | null>
          title={`Edit price #${price.id}`}
          vlabId={price.vlab_id}
          priceId={price.id}
          initialValues={priceValues(price)}
          keyLocked
          okText="Save"
          write={async (body) => {
            if (windowStatus(price) !== WindowStatus.Scheduled) {
              throw new ApiError(
                'It has started since the page loaded, so it can only be replaced or given an end.'
              );
            }
            await assertPriceEdit(price, body);
            return updatePrice(price.id, body);
          }}
          done="Price saved"
          failed="Couldn't save the price"
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

function ReplacePriceButton({ price }: { price: TPrice }) {
  return (
    <DialogButton label="Change price">
      {(close) => (
        <PriceDialog<TPrice>
          title={`Replace price #${price.id}`}
          vlabId={price.vlab_id}
          priceId={price.id}
          initialValues={{ ...priceValues(price), valid_from: undefined }}
          keyLocked
          startAhead
          okText="Add and end the old one"
          write={(body) => replacePrice(price, body)}
          done={(created) => `Price #${created.id} added; #${price.id} ends when it starts`}
          failed={(error) =>
            isPartlyDone(error) ? 'Price only partly replaced' : "Couldn't replace the price"
          }
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function PriceActions({ price }: { price: TPrice }) {
  const status = windowStatus(price);
  if (status === WindowStatus.Expired) return null;
  if (LEGACY_SUBTYPES.includes(price.service_subtype)) {
    return (
      <span className="text-neutral-4 text-sm">
        Legacy subtype: no new price can take over, so it can't be ended here
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      {status === WindowStatus.Scheduled ? (
        <EditPriceButton price={price} />
      ) : (
        <ReplacePriceButton price={price} />
      )}
      <SetEndButton price={price} />
    </span>
  );
}
