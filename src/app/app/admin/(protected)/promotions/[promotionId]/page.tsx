import { requireCapability } from '@/admin/server/resolve';
import { PromotionDetail } from '@/admin/services/virtual-lab/ui/promotion-detail';

export default async function PromotionPage({
  params,
}: {
  params: Promise<{ promotionId: string }>;
}) {
  await requireCapability('promotions.admin');
  const { promotionId } = await params;
  return <PromotionDetail id={promotionId} />;
}
