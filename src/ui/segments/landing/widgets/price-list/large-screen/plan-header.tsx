'use client';

/* eslint-disable react/no-array-index-key */

import { useState } from 'react';

import { Switch } from '@/components/VirtualLab/create-entity-flows/checkout/shared';
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
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [currency] = useCurrency();
  const { discount, month, yearDiscount, yearNormal } = usePrices(currency, plan);
  const isFree = (discount || month || 0) <= 0;

  return (
    <div className={classNames(className, styles.planHeader)}>
      <h2>{plan.title}</h2>
      {plan.buttonLabel && (
        <ContactUs email="subscription@openbraininstitute.org">{plan.buttonLabel}</ContactUs>
      )}
      {plan.price.month.length > 0 && (
        <>
          <div className={styles.priceHeader}>
            {!isFree && (
              <>
                <div className="mb-3 flex items-center gap-1">
                  <span
                    className={classNames(
                      'text-primary-9 text-lg font-light',
                      interval === 'month' && 'font-bold'
                    )}
                  >
                    Monthly
                  </span>
                  <Switch
                    checked={interval === 'year'}
                    name="interval"
                    thumbCls="bg-primary-9"
                    className="border-primary-9 w-[37px]! rounded-3xl! border! border-solid p-1!"
                    onCheckedChange={(checked) => setInterval(checked ? 'year' : 'month')}
                  />
                  <span
                    className={classNames(
                      'text-primary-9 text-lg font-light',
                      interval === 'month' && 'font-bold'
                    )}
                  >
                    Yearly
                  </span>
                </div>
                {interval === 'month' && (
                  <>
                    <div
                      className={classNames(styles.discount, discount ? styles.show : styles.hide)}
                    >
                      <strong>
                        {currency} {month}
                      </strong>
                      <small>/month</small>
                    </div>

                    <div className={styles.price}>
                      <b>
                        {currency} {discount || month}
                      </b>
                      <small>/month</small>
                      {discount && <DiscountPill />}
                    </div>
                  </>
                )}
                {interval === 'year' && (
                  <>
                    <div
                      className={classNames(styles.discount, discount ? styles.show : styles.hide)}
                    >
                      <strong>
                        {currency} {yearNormal}
                      </strong>
                      <small>/year</small>
                    </div>

                    <div className={styles.price}>
                      <b>
                        {currency} {discount ? yearDiscount : yearNormal}
                      </b>
                      <small>/year</small>
                      {discount && <DiscountPill />}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <ul className="mt-2">
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
  return <div className={styles.pill}>Launch price</div>;
}
