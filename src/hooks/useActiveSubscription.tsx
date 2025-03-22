import { useEffect, useState } from 'react';

import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { SubscriptionStatus } from '@/api/virtual-lab-svc/queries/types';
import { tryCatch } from '@/api/utils';

export default function useActiveSubscription() {
  const [disableFeature, setDisableFeature] = useState(false);
  const [data, setData] = useState<{
    status?: SubscriptionStatus;
    canceled_at?: string;
    next_billing_date?: string;
    type?: 'free' | 'paid';
  } | null>(null);

  useEffect(() => {
    (async function getActiveSubscription() {
      const { data: result, error } = await tryCatch(getUserActiveSubscription());
      setData({
        canceled_at: result?.subscription.canceled_at,
        next_billing_date: result?.subscription.next_billing_date,
        status: result?.subscription.status,
        type: result?.subscription.type,
      });
      if (result?.subscription.type === 'free' || error) setDisableFeature(true);
      else setDisableFeature(false);
    })();
  }, [setDisableFeature, setData]);

  return {
    data,
    disableFeature,
  };
}
