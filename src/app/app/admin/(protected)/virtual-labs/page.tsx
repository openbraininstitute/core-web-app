import { requireCapability } from '@/admin/server/resolve';
import { LabsList } from '@/admin/services/virtual-lab/ui/labs-list';

export default async function VirtualLabsPage() {
  await requireCapability('virtualLab.read');
  return <LabsList />;
}
