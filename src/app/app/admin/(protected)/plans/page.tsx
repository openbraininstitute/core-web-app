import { requireCapability } from '@/admin/server/resolve';
import { PlansAndRates } from '@/admin/services/virtual-lab/ui/plans-and-rates';

export default async function PlansPage() {
  await requireCapability('virtualLab.read');
  return <PlansAndRates />;
}
