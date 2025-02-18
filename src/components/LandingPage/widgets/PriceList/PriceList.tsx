/* eslint-disable react/no-array-index-key */
import React from 'react';

import { useSanityContentForPricing } from '../../content/pricing';
import { styleBlockLarge, styleBlockSmall } from '../../styles';
import SelectCurrency from '../../components/select-currency';
import PlanHeader from './PlanHeader';
import FeatureBloc from './FeatureBloc';
import { classNames } from '@/util/utils';

import styles from './PriceList.module.css';

export interface WidgetPriceListProps {
  className?: string;
}

export default function WidgetPriceList({ className }: WidgetPriceListProps) {
  const data = useSanityContentForPricing();

  if (!data) return null;

  const { plans, features } = data;
  return (
    <>
      <div className={classNames(styles.header, styleBlockLarge)}>
        <div>
          <div>Currency: </div>
          <SelectCurrency />
        </div>
      </div>
      <div
        className={classNames(className, styles.priceList, styleBlockLarge)}
        style={{ '--custom-plans-count': plans.length }}
      >
        <div />
        {plans.map((plan, index) => (
          <PlanHeader key={`${plan.title}/${index}`} plan={plan} />
        ))}
        {features.map((bloc, index) => (
          <>
            {index > 0 && <hr className={styles.fullWidth} />}
            <FeatureBloc key={`bloc/${index}`} bloc={bloc} plans={plans} />
          </>
        ))}
      </div>
      <div className={styleBlockSmall}>
        <ul className={styles.notesExplanation}>
          <li>*: Expires in 1 year, non-transferable</li>
          <li>**: Retained for 3 months after cancellation</li>
          <li>***: Published data & models</li>
        </ul>
      </div>
    </>
  );
}
