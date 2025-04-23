import { useEffect, useState } from 'react';

import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { SubscriptionStatus } from '@/api/virtual-lab-svc/queries/types';
import { tryCatch } from '@/api/utils';

export default function useActiveSubscription() {
  const [loading, setLoading] = useState(false);
  const [forbiddenOperation, setForbiddenOperation] = useState(false);
  const [data, setData] = useState<{
    status?: SubscriptionStatus;
    canceled_at?: string;
    next_billing_date?: string;
    type?: 'free' | 'paid';
  } | null>(null);

  useEffect(() => {
    (async function getActiveSubscription() {
      setLoading(true);
      const { data: result, error } = await tryCatch(
        getUserActiveSubscription(),
        () => {
          setLoading(false);
        },
        {
          feature: 'get-user-active-subscription',
          section: 'useActiveSubscription',
        }
      );
      setData({
        canceled_at: result?.subscription.canceled_at,
        next_billing_date: result?.subscription.next_billing_date,
        status: result?.subscription.status,
        type: result?.subscription.type,
      });
      if (
        result?.subscription.type === 'free' ||
        result?.subscription.status !== SubscriptionStatus.ACTIVE ||
        error
      )
        setForbiddenOperation(true);
      else setForbiddenOperation(false);
    })();
  }, [setForbiddenOperation, setData]);

  return {
    loading,
    data,
    forbiddenOperation,
  };
}
