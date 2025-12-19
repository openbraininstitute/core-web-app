import { useQuery } from '@tanstack/react-query';
import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { CheckoutFlow } from '@/components/VirtualLab/create-entity-flows/checkout';
import { SubscriptionCheckoutError } from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import { keyBuilder } from '@/ui/use-query-keys/user';

export function Subscription() {
  const { data, isError } = useQuery({
    queryKey: keyBuilder.subscription(),
    queryFn: getUserActiveSubscription,
  });

  if (isError || !data) {
    return <SubscriptionCheckoutError />;
  }
  return <CheckoutFlow data={data} />;
}

export default Subscription;
