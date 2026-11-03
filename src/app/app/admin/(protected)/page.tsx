import { redirect } from 'next/navigation';

import { ADMIN_ROOT } from '@/admin/shell/sections';

export default function AdminLandingPage() {
  redirect(`${ADMIN_ROOT}/services`);
}
