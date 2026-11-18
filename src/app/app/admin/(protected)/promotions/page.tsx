import { PromotionsList } from '@/admin/sections/virtual-lab/ui/promotions-list';
import { requireCapability } from '@/admin/server/require-capability';

export default async function PromotionsPage() {
  await requireCapability('promotions.admin');
  return <PromotionsList />;
}
