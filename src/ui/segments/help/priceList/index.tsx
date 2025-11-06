'use client';

import { useCredits } from '@/hooks/use-credits';
import { usePrices } from '@/hooks/use-prices';
import PriceTable from '@/ui/segments/help/priceList/price-table';

export default function PriceList() {
  const { prices, loading: pricesLoading, error: pricesError } = usePrices();
  const { creditsPacks, loading: creditsLoading, error: creditsError } = useCredits();

  const loading = pricesLoading || creditsLoading;
  const error = pricesError || creditsError;

  return (
    <div className="flex h-full flex-col overflow-auto">
      {loading && <div>Loading prices...</div>}
      {error && <div>Error: {error}</div>}
      {!loading && !error && <PriceTable prices={prices} creditsPacks={creditsPacks} />}
    </div>
  );
}
