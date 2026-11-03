import { requireCapability } from '@/admin/server/resolve';
import { OpsDashboard } from '@/admin/services/ops/ops-dashboard';

export default async function AdminLandingPage() {
  await requireCapability('ops.view');

  return <OpsDashboard />;
}
