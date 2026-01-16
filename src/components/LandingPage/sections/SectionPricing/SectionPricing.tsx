'use client';

import { useCredits } from '@/hooks/use-credits';
import { usePlanV2 } from '@/hooks/use-plan-v2';
import { usePrices } from '@/hooks/use-prices';
import PriceTable from '@/ui/segments/help/priceList/price-table';
import Plans from '@/ui/segments/plans';
import { classNames } from '@/util/utils';
import { styleBlockFullWidth } from '../../styles';

export default function SectionPricing() {
  const { prices, loading: pricesLoading, error: pricesError } = usePrices();
  const { creditsPacks, loading: creditsLoading, error: creditsError } = useCredits();
  const { plans, loading: plansLoading, error: plansError } = usePlanV2();

  const loading = pricesLoading || creditsLoading || plansLoading;
  const error = pricesError || creditsError || plansError;

  return (
    <>
      <Plans plans={plans} />
      <div
        className={classNames('flex w-full flex-col', styleBlockFullWidth)}
        style={{
          marginTop: '3rem',
          minHeight: '200px',
        }}
      >
        {loading && <div style={{ padding: '1rem' }}>Loading prices...</div>}
        {error && (
          <div style={{ color: 'red', padding: '1rem', backgroundColor: '#ffebee' }}>
            Error loading prices: {error}
          </div>
        )}
        {!loading && !error && (
          <>
            {prices.length === 0 && creditsPacks.length === 0 ? (
              <div style={{ padding: '1rem', color: '#666', backgroundColor: '#f5f5f5' }}>
                No pricing data available. Prices: {prices.length}, Credits: {creditsPacks.length}
              </div>
            ) : (
              <div className="px-8 lg:px-[8.7vw]">
                <PriceTable
                  prices={prices}
                  creditsPacks={creditsPacks}
                  backgroundTitle="bg-black/5"
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
