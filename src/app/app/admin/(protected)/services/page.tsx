import { ServicesBoard } from '@/features/admin/sections/services/services-board';
import { requireCapability } from '@/features/admin/server/require-capability';

export default async function AdminServicesPage() {
  await requireCapability('admin.access');

  return <ServicesBoard />;
}
