import { Reports } from '@/admin/sections/accounting/ui/reports';
import { requireCapability } from '@/admin/server/require-capability';

export default async function AccountingReportsPage() {
  await requireCapability('accounting.admin');
  return <Reports />;
}
