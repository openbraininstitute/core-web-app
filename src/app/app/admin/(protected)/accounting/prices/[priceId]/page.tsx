import { notFound } from 'next/navigation';

import { PriceDetail } from '@/admin/sections/accounting/ui/price-detail';
import { requireCapability } from '@/admin/server/require-capability';

export default async function AccountingPricePage({
  params,
}: {
  params: Promise<{ priceId: string }>;
}) {
  await requireCapability('accounting.admin');
  const { priceId } = await params;
  if (!/^[1-9]\d{0,14}$/.test(priceId)) notFound();
  return <PriceDetail priceId={Number(priceId)} />;
}
