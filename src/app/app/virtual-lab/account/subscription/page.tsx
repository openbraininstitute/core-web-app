import { Fragment } from 'react';
import { Metadata } from 'next';

import {
  ErrorSubscriptionStatus,
  PaidSubscriptionStatus,
  FreeSubscriptionStatus,
  NoSubscriptionFound,
} from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import {
  FreeSubscriptionFlow,
  PaidSubscriptionFlow,
} from '@/components/VirtualLab/create-entity-flows/subscription/index';
import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { tryCatch } from '@/api/utils';

export const metadata: Metadata = {
  title: 'Subscription',
  description: 'Manage your subscription',
};

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { data, error } = await tryCatch(getUserActiveSubscription());

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
        <Fragment key="free-status">
          <FreeSubscriptionStatus />
          <FreeSubscriptionFlow />
        </Fragment>
      ) : (
        <Fragment key="paid-status">
          <PaidSubscriptionStatus key={data.subscription?.id} data={data} />
          <PaidSubscriptionFlow data={data} />
        </Fragment>
      )}
    </div>
  );
}
