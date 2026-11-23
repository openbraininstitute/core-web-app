import { PricesList } from '@/admin/sections/accounting/ui/prices-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function AccountingPricesPage() {
  await requireCapability('accounting.admin');
  return <PricesList />;
}
