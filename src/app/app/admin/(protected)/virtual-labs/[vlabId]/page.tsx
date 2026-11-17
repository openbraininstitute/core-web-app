import { VlabHub } from '@/admin/sections/virtual-lab/ui/vlab-hub';
import { requireCapability } from '@/admin/server/require-capability';

export default async function VirtualLabPage({ params }: { params: Promise<{ vlabId: string }> }) {
  await requireCapability('virtualLab.read');
  const { vlabId } = await params;
  return <VlabHub vlabId={vlabId} />;
}
