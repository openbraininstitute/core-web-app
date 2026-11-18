import { PlansAndRates } from '@/admin/sections/virtual-lab/ui/plans-and-rates';
import { requireCapability } from '@/admin/server/require-capability';

export default async function PlansPage() {
  await requireCapability('virtualLab.read');
  return <PlansAndRates />;
}
