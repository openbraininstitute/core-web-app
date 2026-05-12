import PriceTable from '@/ui/segments/help/priceList/price-table';
import { styleBlockFullWidth } from '@/ui/segments/landing/styles';
import Plans from '@/ui/segments/plans';
import { classNames } from '@/util/utils';

import type { CreditsPack, SinglePrice } from '@/services/sanity';
import type { PlanV2 } from '@/types/virtual-lab/pricing';

interface SectionPricingProps {
  prices: SinglePrice[];
  creditsPacks: CreditsPack[];
  plans: PlanV2[];
}

export default function SectionPricing({ prices, creditsPacks, plans }: SectionPricingProps) {
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
        {prices.length === 0 && creditsPacks.length === 0 ? (
          <div style={{ padding: '1rem', color: '#666', backgroundColor: '#f5f5f5' }}>
            No pricing data available.
          </div>
        ) : (
          <div className="px-8 lg:px-[8.7vw]">
            <PriceTable prices={prices} creditsPacks={creditsPacks} backgroundTitle="bg-black/5" />
          </div>
        )}
      </div>
    </>
  );
}
