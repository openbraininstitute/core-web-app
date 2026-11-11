import { useQuery } from '@tanstack/react-query';

import { getSetupIntent } from '@/api/virtual-lab-svc/queries/payment';
import { getStripe } from '@/features/stripe/client';
import { confirmStripeSetupPaymentMethod } from '@/features/stripe/confirm-setup';
import { keyBuilder as externalKeyBuilder } from '@/ui/use-query-keys/third-parties';

import type { Stripe, StripeElements } from '@stripe/stripe-js';
import type { User } from 'next-auth';
import type { TBillingAddress } from '@/api/virtual-lab-svc/queries/types';

export function useSetupIntentQuery({
  enabled = true,
  virtualLabId,
}: {
  enabled?: boolean;
  virtualLabId: string;
}) {
  return useQuery({
    queryKey: externalKeyBuilder.stripeSetupIntent({ virtualLabId }),
    queryFn: getSetupIntent,
    enabled,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useStripeInstanceQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: externalKeyBuilder.stripeInstance(),
    queryFn: getStripe,
    enabled,
  });
}

export async function resolvePaymentMethodId({
  billingAddress,
  cachedPaymentMethodId,
  elements,
  returnUrl,
  stripe,
  user,
}: {
  billingAddress: TBillingAddress;
  cachedPaymentMethodId: string | null;
  elements: StripeElements;
  returnUrl: string;
  stripe: Stripe;
  user: User;
}): Promise<string> {
  if (cachedPaymentMethodId) {
    return cachedPaymentMethodId;
  }

  return confirmStripeSetupPaymentMethod({
    billingAddress,
    elements,
    returnUrl,
    stripe,
    user,
  });
}
