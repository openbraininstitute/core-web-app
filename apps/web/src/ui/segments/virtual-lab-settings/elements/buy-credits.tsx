'use client';

import { useState } from 'react';
import { match } from 'ts-pattern';

import { StripePaymentFlow } from '@/features/payments/standalone';
import {
  PaymentModeSelection,
  PurchaseModeDictionary,
  type TPurchaseModeDictionary,
} from '@/ui/segments/virtual-lab-settings/elements/payment-mode-selection';
import { PromotionCode } from '@/ui/segments/virtual-lab-settings/elements/promotion-code-form';

type Props = {
  virtualLabId: string;
  onBack: () => void;
};

export function BuyCredits({ virtualLabId }: Props) {
  const [mode, setMode] = useState<TPurchaseModeDictionary>(PurchaseModeDictionary.Selection);
  const onModeChange = (m: TPurchaseModeDictionary) => setMode(m);

  const content = match({ mode })
    .with({ mode: PurchaseModeDictionary.Selection }, () => (
      <PaymentModeSelection virtualLabId={virtualLabId} onModeChange={onModeChange} />
    ))
    .with({ mode: PurchaseModeDictionary.Buy }, () => (
      <StripePaymentFlow virtualLabId={virtualLabId} onModeChange={onModeChange} />
    ))
    .with({ mode: PurchaseModeDictionary.Promo }, () => (
      <PromotionCode virtualLabId={virtualLabId} onModeChange={onModeChange} />
    ))
    .otherwise(() => null);

  return (
    <section
      id="buy-credits-header"
      className="flex h-full min-h-0 w-full flex-1 flex-col gap-3.5 rounded-2xl bg-white px-4 pt-4"
    >
      <div
        id="buy-credits-content"
        className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col"
      >
        {content}
      </div>
    </section>
  );
}
