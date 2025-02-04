/* eslint-disable react/no-array-index-key */
import React from 'react';

import { useSanityContentForPricing } from '../../content/pricing';
import { styleBlockLarge } from '../../styles';
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
    <div
      className={classNames(className, styles.priceList, styleBlockLarge)}
      style={{ '--custom-plans-count': plans.length }}
    >
      <div />
      {plans.map((plan) => (
        <PlanHeader key={plan.title} plan={plan} />
      ))}
      {features.map((bloc, index) => (
        <>
          {index > 0 && <hr className={styles.fullWidth} />}
          <FeatureBloc key={`bloc/${index}`} bloc={bloc} plans={plans} />
        </>
      ))}
    </div>
  );
}
