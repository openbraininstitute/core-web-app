import { redirect } from 'next/navigation';

import { ADMIN_ROOT } from '@/features/admin/routes';

export default function AdminLandingPage() {
  redirect(`${ADMIN_ROOT}/services`);
}
