import { styleBlockLarge } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import LargeScreen from './large-screen';
import SmallScreen from './small-screen';

import type { ContentForPricing } from '@/services/sanity/api/get-pricing-features';

import styles from './price-list.module.css';

interface WidgetPriceListProps {
  data: ContentForPricing | null;
}

export default function WidgetPriceList({ data }: WidgetPriceListProps) {
  return (
    <>
      <div className={classNames(styles.header, styleBlockLarge)}>
        <div>
          <LargeScreen data={data} />
          <SmallScreen data={data} />
        </div>
      </div>
    </>
  );
}
