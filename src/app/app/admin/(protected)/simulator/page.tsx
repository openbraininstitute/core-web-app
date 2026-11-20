import { SimulatorCaches } from '@/admin/sections/simulator/simulator-caches';
import { requireCapability } from '@/admin/server/require-capability';

export default async function AdminSimulatorPage() {
  await requireCapability('simulator.admin');

  return <SimulatorCaches />;
}
