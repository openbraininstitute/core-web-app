import { styleBlockLarge } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import GeneralList from './general-list';
import LabList from './lab-list';
import SectionTitle from './section-title';

import type { ContentForPriceList2 } from '@/services/sanity/api/get-price-list-content';

import styles from './price-list-2.module.css';

interface WidgetPriceList2Props {
  className?: string;
  data: ContentForPriceList2;
}

export default function WidgetPriceList2({ className, data }: WidgetPriceList2Props) {
  const { plans, labList, generalList } = data;

  return (
    <div
      className={classNames(className, styles.priceList2, styleBlockLarge)}
      style={{ '--custom-plans-count': plans.length }}
    >
      <div />
      {plans.map((plan) => (
        <h2 key={plan.id}>{plan.title}</h2>
      ))}
      <SectionTitle className={styles.fullWidth}>General</SectionTitle>
      <GeneralList value={generalList} plans={plans} />
      <LabList value={labList} plans={plans} />
    </div>
  );
}
