import { useQuery } from '@tanstack/react-query';

import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { SubscriptionStatus } from '@/api/virtual-lab-svc/queries/types';
import { keyBuilder } from '@/ui/use-query-keys/user';

export function useActiveSubscription() {
  let forbiddenOperation = true;

  const {
    data: result,
    isLoading,
    isError,
  } = useQuery({
    queryKey: keyBuilder.subscription(),
    queryFn: getUserActiveSubscription,
  });

  const canceled_at = result?.subscription.canceled_at;
  const next_billing_date = result?.subscription.next_billing_date;
  const status = result?.subscription.status;
  const type = result?.subscription.type;

  const data = {
    canceled_at,
    next_billing_date,
    status,
    type,
  };
  if (
    result?.subscription.type === 'free' ||
    result?.subscription.status !== SubscriptionStatus.ACTIVE ||
    isError
  )
    forbiddenOperation = true;
  else forbiddenOperation = false;

  return {
    loading: isLoading,
    data,
    forbiddenOperation,
  };
}

export default useActiveSubscription;
