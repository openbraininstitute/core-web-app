import { requireCapability } from '@/features/admin/server/require-capability';
import { AdminShell } from '@/features/admin/shell/admin-shell';

import type { ReactNode } from 'react';

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const capabilities = await requireCapability('admin.access');

  return <AdminShell capabilities={capabilities}>{children}</AdminShell>;
}
