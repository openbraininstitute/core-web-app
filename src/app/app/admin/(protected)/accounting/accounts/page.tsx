import { AccountsList } from '@/admin/sections/accounting/ui/accounts-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function AccountingAccountsPage() {
  await requireCapability('accounting.admin');
  return <AccountsList />;
}
