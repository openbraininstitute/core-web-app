import { UserDetail } from '@/admin/sections/virtual-lab/ui/user-detail';
import { requireCapability } from '@/admin/server/require-capability';

export default async function UserPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireCapability('virtualLab.read');
  const { userId } = await params;
  return <UserDetail userId={userId} />;
}
