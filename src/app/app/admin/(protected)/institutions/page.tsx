import { requireCapability } from '@/admin/server/resolve';
import { InstitutionsList } from '@/admin/services/virtual-lab/ui/institutions-list';

export default async function InstitutionsPage() {
  await requireCapability('virtualLab.admin');
  return <InstitutionsList />;
}
