'use client';

import { LoadingOutlined } from '@ant-design/icons';

import { BillingAddressElement, BillingCardElement } from '@/features/stripe/payment-elements';
import { Button as UiButton } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { StripePaymentElementChangeEvent } from '@stripe/stripe-js';
import type { TBillingAddress } from '@/api/virtual-lab-svc/queries/types';

export function StandalonePaymentMethodSection({
  billingAddress,
  disabled,
  onCancel,
  onCardChange,
  onPay,
  onPaymentReady,
  onBillingAddressChange,
  onSaveBillingAddressChange,
  payDisabled,
  saveBillingAddress,
  submitting,
}: {
  billingAddress: TBillingAddress | null;
  disabled: boolean;
  onCancel: () => void;
  onCardChange: (event: StripePaymentElementChangeEvent) => void;
  onPay: () => void;
  onPaymentReady: () => void;
  onBillingAddressChange: (address: TBillingAddress | null) => void;
  onSaveBillingAddressChange: (checked: boolean) => void;
  payDisabled: boolean;
  saveBillingAddress: boolean;
  submitting: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-white">
      <div className="mb-4 font-semibold">Payment method</div>
      <div className="flex flex-col gap-4">
        <BillingAddressElement
          address={billingAddress}
          disabled={disabled}
          framed={false}
          onAddressChange={onBillingAddressChange}
          onSaveAddressChange={onSaveBillingAddressChange}
          saveAddress={saveBillingAddress}
        />
        <BillingCardElement
          disabled={disabled}
          framed={false}
          onChange={onCardChange}
          onReady={onPaymentReady}
          paymentElementId="credits-form"
        />
      </div>
      <div className="mt-5 flex items-center justify-end gap-4">
        <UiButton
          rounded
          type="button"
          variant="ghost"
          size="lg"
          className="hover:border-primary-4! w-max border border-none text-white shadow-2xl hover:border"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </UiButton>
        <UiButton
          rounded
          type="button"
          variant="default"
          size="lg"
          className={cn(
            'border-primary-4! w-max border shadow-2xl',
            'hover:bg-primary-8/40',
            'hover:shadow-[1px_2px_4px_0px_#00000099]',
            'shadow-[8px_12px_24px_0px_#00000099]',
            'shadow-[-8px_-8px_42px_0px_#FFFFFF29]'
          )}
          disabled={payDisabled}
          onClick={onPay}
        >
          <div className="flex w-24 items-center justify-center">
            Pay
            {submitting && <LoadingOutlined spin className="ml-2 text-white" />}
          </div>
        </UiButton>
      </div>
    </div>
  );
}
