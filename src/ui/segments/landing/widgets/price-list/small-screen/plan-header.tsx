/* eslint-disable react/no-array-index-key */
import React from 'react';

import { useCurrency } from '@/ui/segments/landing/atoms';
import { classNames } from '@/util/utils';

import ContactUs from '../contact-us';

import type {
  ContentForPricingPlan,
  MultiCurrencyPrice,
} from '@/services/sanity/api/get-pricing-features';

import styles from './plan-header.module.css';

interface PlanHeaderProps {
  className?: string;
  plan: ContentForPricingPlan;
}

export default function PlanHeader({ className, plan }: PlanHeaderProps) {
  const [currency] = useCurrency();
  const { discount, month, yearDiscount, yearNormal } = usePrices(currency, plan);
  const isFree = (discount || month || 0) <= 0;

  return (
    <div className={classNames(className, styles.planHeader)}>
      <h1>{plan.title} Plan</h1>
      {plan.buttonLabel && <ContactUs>{plan.buttonLabel}</ContactUs>}
      {plan.price.month.length > 0 && (
        <>
          <div className={styles.priceHeader}>
            {!isFree && (
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
                {discount && <DiscountPill />}
                <div className={styles.price}>
                  <b>
                    {currency} {discount || month}
                  </b>
                  <small>/month</small>
                </div>
                <div className={styles.price}>
                  <b>
                    {currency} {discount ? yearDiscount : yearNormal}
                  </b>
                  <small>/year</small>
                </div>
              </>
            )}
          </div>
          {plan.notes.length > 0 && <hr />}
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

function DiscountPill() {
  return <div className={styles.pill}>Special launch price</div>;
}
