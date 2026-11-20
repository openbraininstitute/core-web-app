import { AccountDetail } from '@/admin/sections/accounting/ui/account-detail';
import { requireCapability } from '@/admin/server/require-capability';

export default async function AccountingAccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  await requireCapability('accounting.admin');
  const { accountId } = await params;
  return <AccountDetail accountId={accountId} />;
}
