import { requireCapability } from '@/admin/server/resolve';
import { VlabHub } from '@/admin/services/virtual-lab/ui/vlab-hub';

export default async function VirtualLabPage({ params }: { params: Promise<{ vlabId: string }> }) {
  await requireCapability('virtualLab.read');
  const { vlabId } = await params;
  return <VlabHub vlabId={vlabId} />;
}
