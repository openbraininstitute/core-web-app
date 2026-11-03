import { requireCapability } from '@/admin/server/resolve';
import { UsersList } from '@/admin/services/virtual-lab/ui/users-list';

export default async function UsersPage() {
  await requireCapability('virtualLab.read');
  return <UsersList />;
}
