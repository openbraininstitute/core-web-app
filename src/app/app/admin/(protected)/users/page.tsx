import { UsersList } from '@/admin/sections/virtual-lab/ui/users-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function UsersPage() {
  await requireCapability('virtualLab.read');
  return <UsersList />;
}
