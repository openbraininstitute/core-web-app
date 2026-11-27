import { DiscountsList } from '@/admin/sections/accounting/ui/discounts-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function AccountingDiscountsPage() {
  await requireCapability('accounting.admin');
  return <DiscountsList />;
}
