import { ServicesBoard } from '@/admin/sections/services/services-board';
import { requireCapability } from '@/admin/server/require-capability';

export default async function AdminServicesPage() {
  await requireCapability('admin.access');

  return <ServicesBoard />;
}
