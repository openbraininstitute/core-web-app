import { AddressElement, Elements, PaymentElement, useStripe } from '@stripe/react-stripe-js';

import { stripeAppearance, stripeFonts } from '@/features/stripe/style';
import { makeBillingAddressFromStripeEvent } from '@/features/stripe/utils';
import { Checkbox } from '@/ui/molecules/checkbox';
import { cn } from '@/utils/css-class';

import type { StripeElementsOptions } from '@stripe/stripe-js';
import type { TBillingAddress } from '@/api/virtual-lab-svc/queries/types';

export const buildStripeFormOptions = (clientSecret: string): StripeElementsOptions => ({
  clientSecret,
  fonts: stripeFonts,
  appearance: stripeAppearance,
});

const buildStripeAddressOptions = (): StripeElementsOptions => ({
  fonts: stripeFonts,
  appearance: stripeAppearance,
});

function StripeAddressFields({
  disabled,
  onAddressChange,
}: {
  disabled: boolean;
  onAddressChange: (address: TBillingAddress | null) => void;
}) {
  return (
    <AddressElement
      options={{
        mode: 'billing',
        display: { name: 'full' },
        fields: { phone: 'never' },
      }}
      onChange={(event) => onAddressChange(makeBillingAddressFromStripeEvent(event))}
      className={cn(disabled && 'pointer-events-none opacity-70')}
    />
  );
}

function IsolatedStripeAddressElement({
  disabled,
  onAddressChange,
}: {
  disabled: boolean;
  onAddressChange: (address: TBillingAddress | null) => void;
}) {
  const stripe = useStripe();

  if (!stripe) {
    return null;
  }

  return (
    <Elements stripe={stripe} options={buildStripeAddressOptions()}>
      <StripeAddressFields disabled={disabled} onAddressChange={onAddressChange} />
    </Elements>
  );
}

export function BillingAddressElement({
  address,
  disabled = false,
  framed = true,
  onAddressChange,
  onSaveAddressChange,
  saveAddress,
}: {
  address: TBillingAddress | null;
  disabled?: boolean;
  framed?: boolean;
  onAddressChange: (address: TBillingAddress | null) => void;
  onSaveAddressChange: (checked: boolean) => void;
  saveAddress: boolean;
}) {
  return (
    <div className={cn('text-white', framed && 'rounded-lg border border-white/10 bg-white/5 p-4')}>
      <IsolatedStripeAddressElement disabled={disabled} onAddressChange={onAddressChange} />
      <div className="mt-4 flex items-center justify-start gap-1.5">
        <Checkbox
          id="save-address-checkbox"
          checked={saveAddress}
          className={cn(
            'text-white! disabled:text-white! shadow-lg size-5 focus:shadow-2xl',
            'data-[state=checked]:bg-white! data-[state=checked]:text-primary-9!'
          )}
          disabled={disabled || !address?.country}
          onCheckedChange={(checked) => onSaveAddressChange(Boolean(checked))}
        />
        <label className="cursor-pointer" htmlFor="save-address-checkbox">
          Save this as my profile address
        </label>
      </div>
    </div>
  );
}

export function BillingCardElement({
  disabled = false,
  framed = true,
  onReady,
  paymentElementId,
}: {
  disabled?: boolean;
  framed?: boolean;
  onReady: () => void;
  paymentElementId: string;
}) {
  return (
    <div
      className={cn(
        'text-white',
        framed && 'rounded-lg border border-white/10 bg-white/5 p-4',
        disabled && 'pointer-events-none opacity-70'
      )}
    >
      <PaymentElement
        id={paymentElementId}
        onReady={onReady}
        options={{
          fields: {
            billingDetails: 'never',
          },
          layout: {
            type: 'tabs',
          },
          terms: { card: 'never' },
        }}
      />
    </div>
  );
}
