import type { StripeAddressElementChangeEvent } from '@stripe/stripe-js';
import type { User } from 'next-auth';
import type { TBillingAddress } from '@/api/virtual-lab-svc/queries/types';

export function makeBillingAddressFromStripeEvent(
  event: StripeAddressElementChangeEvent
): TBillingAddress | null {
  if (!event.value.address.country) {
    return null;
  }

  return {
    name: event.value.name,
    line1: event.value.address.line1 || null,
    line2: event.value.address.line2 || null,
    city: event.value.address.city || null,
    state: event.value.address.state || null,
    postal_code: event.value.address.postal_code || null,
    country: event.value.address.country,
  };
}

export function makeStripeBilling(address: TBillingAddress, user: User) {
  return {
    email: user.email,
    name: address.name || user.name,
    phone: '',
    address: {
      country: address.country,
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      postal_code: address.postal_code || '',
    },
  };
}

export function formatMinorCurrency(amount: number, currency?: string | null) {
  const code = (currency?.trim() ? currency : 'chf').toUpperCase();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
  }).format(amount / 100);
}
