import { requireCapability } from '@/admin/server/resolve';
import { SubscriptionsList } from '@/admin/services/virtual-lab/ui/subscriptions-list';

export default async function SubscriptionsPage() {
  await requireCapability('virtualLab.read');
  return <SubscriptionsList />;
}
