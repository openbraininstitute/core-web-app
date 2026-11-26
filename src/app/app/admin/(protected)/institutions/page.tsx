import { InstitutionsList } from '@/admin/sections/virtual-lab/ui/institutions-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function InstitutionsPage() {
  await requireCapability('education.admin');
  return <InstitutionsList />;
}
