import { Metadata } from 'next';

import { SubscriptionCheckoutError } from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { CheckoutFlow } from '@/components/VirtualLab/create-entity-flows/checkout';
import { tryCatch } from '@/api/utils';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Checkout for your subscription',
};

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { data, error } = await tryCatch(getUserActiveSubscription(), undefined, {
    section: 'subscription-checkout-page',
    feature: 'get-user-active-subscription',
  });

  if (error) {
    return <SubscriptionCheckoutError />;
  }
  return <CheckoutFlow data={data} />;
}
