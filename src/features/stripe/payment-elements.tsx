import { LoadingOutlined } from '@ant-design/icons';
import { AddressElement, Elements, PaymentElement, useStripe } from '@stripe/react-stripe-js';
import { useQueries } from '@tanstack/react-query';

import { getCountries } from '@/api/virtual-lab-svc/queries/config';
import { getUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { stripeAppearance, stripeFonts } from '@/features/stripe/style';
import { makeBillingAddressFromStripeEvent } from '@/features/stripe/utils';
import { Checkbox } from '@/ui/molecules/checkbox';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';
import { keyBuilder as userKeyBuilder } from '@/ui/use-query-keys/user';
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
  const { countries, profile, isLoading } = useQueries({
    queries: [
      {
        queryKey: keyBuilder.countries(),
        queryFn: getCountries,
        staleTime: Infinity,
      },
      {
        queryKey: userKeyBuilder.profile(),
        queryFn: getUserProfile,
        staleTime: Infinity,
      },
    ],
    combine: ([countries, profile]) => {
      return {
        countries: countries.data?.map((p) => p.code),
        profile: profile.data?.profile,
        isLoading: countries.isLoading || profile.isLoading,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="py-2 flex items-center justify-center w-full bg-red-500">
        <LoadingOutlined spin className="text-lg" />
      </div>
    );
  }

  return (
    <AddressElement
      options={{
        mode: 'billing',
        display: { name: 'split' },
        fields: { phone: 'never' },
        allowedCountries: countries,
        autocomplete: { mode: 'automatic' },
        defaultValues: {
          firstName: profile?.first_name,
          lastName: profile?.last_name,
          address: {
            country: profile?.address.country ?? 'CH',
            line1: profile?.address.street,
            line2: '',
            city: profile?.address.locality,
            postal_code: profile?.address.postal_code,
            state: profile?.address.region,
          },
        },
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
    <div
      className={cn(
        'text-primary-9',
        framed && 'rounded-lg border border-primary-9/10 bg-primary-9/5 p-4'
      )}
    >
      <IsolatedStripeAddressElement disabled={disabled} onAddressChange={onAddressChange} />
      <div className="mt-4 flex items-center justify-start gap-1.5">
        <Checkbox
          id="save-address-checkbox"
          checked={saveAddress}
          className={cn(
            'text-primary-9! disabled:text-primary-9! shadow-lg size-5 focus:shadow-2xl',
            'data-[state=checked]:bg-primary-9! data-[state=checked]:text-white!'
          )}
          disabled={disabled || !address?.country}
          onCheckedChange={(checked) => onSaveAddressChange(Boolean(checked))}
        />
        <label className="cursor-pointer" htmlFor="save-address-checkbox">
          Use this as my profile address
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
        'text-primary-9',
        framed && 'rounded-lg border border-primary-9/10 bg-primary-9/5 p-4',
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
