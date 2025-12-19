'use client';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { match } from 'ts-pattern';
import { Button as UiButton } from '@/ui/molecules/button';
import {
  PaymentModeSelection,
  PurchaseModeDictionary,
  type TPurchaseModeDictionary,
} from '@/ui/segments/virtual-lab-settings/elements/payment-mode-selection';
import { PromotionCode } from '@/ui/segments/virtual-lab-settings/elements/promotion-code-form';
import { StripePaymentFlow } from '@/ui/segments/virtual-lab-settings/elements/stripe-payment';

type Props = {
  virtualLabId: string;
  onBack: () => void;
};

export function BuyCredits({ onBack, virtualLabId }: Props) {
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
    <div className="relative mb-10 flex h-full flex-col">
      <div
        id="buy-credits-header"
        className="bg-primary-9 sticky top-0 z-10 flex shrink-0 items-center px-6 py-5"
      >
        <div className="flex w-full items-center gap-4">
          <UiButton
            rounded
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="hover:bg-neutral-2/20 h-auto !px-4 py-2! text-white hover:text-white"
          >
            <ArrowLeftOutlined className="text-lg" />
            <span className="ml-4 text-lg font-bold text-white select-none">Credits</span>
          </UiButton>
        </div>
      </div>
      <div id="buy-credits-content" className="mx-auto h-full w-full max-w-3xl px-3">
        {content}
      </div>
    </div>
  );
}
