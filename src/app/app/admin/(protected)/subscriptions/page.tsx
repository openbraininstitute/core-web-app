import { SubscriptionsList } from '@/admin/sections/virtual-lab/ui/subscriptions-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function SubscriptionsPage() {
  await requireCapability('virtualLab.read');
  return <SubscriptionsList />;
}
