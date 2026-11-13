import { hasCapability } from '@/admin/capabilities/has-capability';
import { ServicesBoard } from '@/admin/sections/services/services-board';
import { GlobalSearch } from '@/admin/sections/virtual-lab/ui/global-search';
import { requireCapability } from '@/admin/server/require-capability';

export default async function AdminLandingPage() {
  const capabilities = await requireCapability('admin.access');

  return (
    <div className="flex flex-col gap-6">
      {hasCapability(capabilities, 'virtualLab.read') && <GlobalSearch />}
      <ServicesBoard />
    </div>
  );
}
