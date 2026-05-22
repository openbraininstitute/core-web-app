import { loadStripe } from '@stripe/stripe-js';

import { config } from '@/config';

import type { Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(config.STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

export default getStripe;
