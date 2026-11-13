import { LabsList } from '@/admin/sections/virtual-lab/ui/labs-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function VirtualLabsPage() {
  await requireCapability('virtualLab.read');
  return <LabsList />;
}
