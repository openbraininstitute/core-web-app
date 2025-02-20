/* eslint-disable react/no-array-index-key */
import React from 'react';

import { classNames } from '@/util/utils';
import {
  ContentForPricingPlan,
  MultiCurrencyPrice,
} from '@/components/LandingPage/content/pricing';

import { useCurrency } from '@/components/LandingPage/atoms';
import styles from './PlanHeader.module.css';

export interface PlanHeaderProps {
  className?: string;
  plan: ContentForPricingPlan;
}

export default function PlanHeader({ className, plan }: PlanHeaderProps) {
  const [currency] = useCurrency();
  const { discount, month, yearDiscount, yearNormal } = usePrices(currency, plan);

  return (
    <div className={classNames(className, styles.planHeader)}>
      <h2>{plan.title}</h2>
      {plan.price.month.length > 0 && (
        <>
          <hr />
          <em>Subscription</em>
          <div className={classNames(styles.discount, discount ? styles.show : styles.hide)}>
            <strong>
              {currency} {month}
            </strong>
            <small>/month</small>
          </div>
          <div className={classNames(styles.discount, discount ? styles.show : styles.hide)}>
            <strong>
              {currency} {yearNormal}
            </strong>
            <small>/year</small>
          </div>
          <div className={styles.price}>
            <big>
              {currency} {discount || month}
            </big>
            /month
            {discount && <div className={styles.pill}>Launch</div>}
          </div>
          <div className={styles.price}>
            <big>
              {currency} {discount ? yearDiscount : yearNormal}
            </big>
            /year
            {discount && <div className={styles.pill}>Launch</div>}
          </div>
          <ul>
            {plan.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function usePrices(currency: string, plan: ContentForPricingPlan) {
  return {
    discount: extractPrice(currency, plan.price.discount),
    month: extractPrice(currency, plan.price.month),
    yearNormal: extractPrice(currency, plan.price.yearNormal),
    yearDiscount: extractPrice(currency, plan.price.yearDiscount),
  };
}

function extractPrice(currency: string, price?: null | MultiCurrencyPrice[]): number | null {
  if (!price) return null;

  return price.find((item) => item.currency === currency)?.value ?? null;
}
