import { requireCapability } from '@/admin/server/resolve';
import { OpsDashboard } from '@/admin/services/ops/ops-dashboard';

export default async function AdminServicesPage() {
  await requireCapability('ops.view');

  return <OpsDashboard />;
}
