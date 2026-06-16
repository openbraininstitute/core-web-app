'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { RiSecurePaymentFill } from '@remixicon/react';

import { BillingAddressElement, BillingCardElement } from '@/features/stripe/payment-elements';
import { GhostRoundedIconButton } from '@/ui/segments/workspaces/space-manager/sections/elements';

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
    <div className="rounded-2xl text-primary-9">
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
      <div className="mt-5 flex items-center justify-end gap-4 pb-5">
        <GhostRoundedIconButton
          label="Cancel"
          classNames={{ label: 'font-semibold', root: 'hover:bg-gray-100' }}
          onClick={onCancel}
          iconPosition="start"
          disabled={submitting}
        />

        <GhostRoundedIconButton
          label="Pay"
          icon={
            submitting ? <LoadingOutlined spin className="text-white" /> : <RiSecurePaymentFill />
          }
          classNames={{
            root: 'bg-primary-9 text-white hover:bg-primary-8 group',
            label: 'text-white pr-6',
            iconWrapper: 'bg-primary-9 text-white! group-hover:bg-primary-8!',
          }}
          disabled={payDisabled || submitting}
          onClick={onPay}
          iconPosition="end"
        />
      </div>
    </div>
  );
}
