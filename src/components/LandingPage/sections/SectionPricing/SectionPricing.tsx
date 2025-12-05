'use client';

import SanityContentRTF from '../../components/SanityContentRTF';
import { useSanityContentRTF } from '../../content/content';
import { styleBlockFullWidth } from '../../styles';
import { EnumSection } from '../sections';

import { useCredits } from '@/hooks/use-credits';
import { usePrices } from '@/hooks/use-prices';
import PriceTable from '@/ui/segments/help/priceList/price-table';
import { classNames } from '@/util/utils';

export default function SectionPricing() {
  const content = useSanityContentRTF(EnumSection.Pricing);
  const { prices, loading: pricesLoading, error: pricesError } = usePrices();
  const { creditsPacks, loading: creditsLoading, error: creditsError } = useCredits();

  const loading = pricesLoading || creditsLoading;
  const error = pricesError || creditsError;

  return (
    <>
      <SanityContentRTF value={content} />
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
