import { makeStripeBilling } from './utils';

import type { Stripe, StripeElements } from '@stripe/stripe-js';
import type { User } from 'next-auth';
import type { TBillingAddress } from '@/api/virtual-lab-svc/queries/types';

export type StripeSetupConfirmationErrorReason = 'stripe_error' | 'missing_payment_method';

export class StripeSetupConfirmationError extends Error {
  reason: StripeSetupConfirmationErrorReason;

  constructor(reason: StripeSetupConfirmationErrorReason, message?: string) {
    super(message);
    this.name = 'StripeSetupConfirmationError';
    this.reason = reason;
  }
}

export async function confirmStripeSetupPaymentMethod({
  billingAddress,
  elements,
  returnUrl,
  stripe,
  user,
}: {
  billingAddress: TBillingAddress;
  elements: StripeElements;
  returnUrl: string;
  stripe: Stripe;
  user: User;
}) {
  const { setupIntent, error } = await stripe.confirmSetup({
    elements,
    redirect: 'if_required',
    confirmParams: {
      return_url: returnUrl,
      payment_method_data: {
        billing_details: makeStripeBilling(billingAddress, user),
      },
    },
  });

  if (error) {
    throw new StripeSetupConfirmationError('stripe_error', error.message);
  }

  if (setupIntent?.status !== 'succeeded' || !setupIntent.payment_method) {
    throw new StripeSetupConfirmationError('missing_payment_method');
  }

  return typeof setupIntent.payment_method === 'string'
    ? setupIntent.payment_method
    : setupIntent.payment_method.id;
}
