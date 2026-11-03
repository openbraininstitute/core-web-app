import { requireCapability } from '@/admin/server/resolve';
import { UserDetail } from '@/admin/services/virtual-lab/ui/user-detail';

export default async function UserPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireCapability('virtualLab.read');
  const { userId } = await params;
  return <UserDetail userId={userId} />;
}
