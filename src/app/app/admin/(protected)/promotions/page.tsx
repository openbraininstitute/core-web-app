import { requireCapability } from '@/admin/server/resolve';
import { PromotionsList } from '@/admin/services/virtual-lab/ui/promotions-list';

export default async function PromotionsPage() {
  await requireCapability('promotions.admin');
  return <PromotionsList />;
}
