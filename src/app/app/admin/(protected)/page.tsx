import { redirect } from 'next/navigation';

import { ADMIN_ROOT } from '@/features/admin/routes';
import { requireCapability } from '@/features/admin/server/require-capability';

export default async function AdminLandingPage() {
  await requireCapability('admin.access');
  redirect(`${ADMIN_ROOT}/services`);
}
