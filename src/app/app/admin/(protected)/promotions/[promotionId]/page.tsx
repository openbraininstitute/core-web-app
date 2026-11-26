import { PromotionDetail } from '@/admin/sections/virtual-lab/ui/promotion-detail';
import { requireCapability } from '@/admin/server/require-capability';

export default async function PromotionPage({
  params,
}: {
  params: Promise<{ promotionId: string }>;
}) {
  await requireCapability('promotions.admin');
  const { promotionId } = await params;
  return <PromotionDetail promotionId={promotionId} />;
}
