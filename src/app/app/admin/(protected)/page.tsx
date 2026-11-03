import { hasCapability } from '@/admin/capabilities/has-capability';
import { requireCapability } from '@/admin/server/resolve';
import { OpsDashboard } from '@/admin/services/ops/ops-dashboard';
import { GlobalSearch } from '@/admin/services/virtual-lab/ui/global-search';

export default async function AdminLandingPage() {
  const capabilities = await requireCapability('ops.view');

  return (
    <div className="flex flex-col gap-6">
      {hasCapability(capabilities, 'virtualLab.read') && <GlobalSearch />}
      <OpsDashboard />
    </div>
  );
}
