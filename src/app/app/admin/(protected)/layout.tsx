import { requireCapability } from '@/admin/server/resolve';
import { AdminShell } from '@/admin/shell/admin-shell';

import type { ReactNode } from 'react';

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const capabilities = await requireCapability('ops.view');

  return <AdminShell capabilities={capabilities}>{children}</AdminShell>;
}
