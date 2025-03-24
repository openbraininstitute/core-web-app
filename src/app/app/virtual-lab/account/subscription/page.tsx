import { Metadata } from 'next';

import {
  ErrorSubscriptionStatus,
  PaidSubscriptionStatus,
  FreeSubscriptionStatus,
  NoSubscriptionFound,
} from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import { ChangeTier } from '@/components/VirtualLab/create-entity-flows/subscription/index';
import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { tryCatch } from '@/api/utils';

export const metadata: Metadata = {
  title: 'Subscription',
  description: 'Manage your subscription',
};

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { data, error } = await tryCatch(getUserActiveSubscription(), undefined, {
    section: 'subscription-home-page',
    feature: 'get-user-active-subscription',
  });

  if (error) {
    return (
      <div className="px-5">
        <ErrorSubscriptionStatus />
      </div>
    );
  }
  if (!data || !data.subscription) {
    return <NoSubscriptionFound />;
  }

  return (
    <div className="px-5">
      {data?.subscription.type === 'free' ? (
        <FreeSubscriptionStatus />
      ) : (
        <PaidSubscriptionStatus key={data.subscription?.id} data={data} />
      )}
      <div className="w-full items-center justify-items-end">
        <ChangeTier />
      </div>
    </div>
  );
}
