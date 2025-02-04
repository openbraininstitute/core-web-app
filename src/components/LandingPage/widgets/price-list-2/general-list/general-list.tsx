import React from 'react';

import { ContentForPriceList2GeneralItem, ContentForPriceList2GeneralPriceItem } from '../hooks';
import { useCurrency } from '@/components/LandingPage/atoms';

import styles from './general-list.module.css';

export interface GeneralListProps {
  value: ContentForPriceList2GeneralItem[];
  plans: Array<{ title: string; id: string }>;
}

export default function GeneralList({ value, plans }: GeneralListProps) {
  const [currency] = useCurrency();

  return (
    <>
      {value.map((item) => (
        <>
          <div key={item.name}>{item.name}</div>
          {plans.map((plan) => {
            const price = getPrice(item.prices, currency, plan.id);
            return (
              <div key={`${item.name}/${plan.id}`}>
                {price}
                {price && (
                  <div className={styles.type}>
                    {currency} / {item.type}
                  </div>
                )}
              </div>
            );
          })}
        </>
      ))}
    </>
  );
}

function getPrice(
  prices: ContentForPriceList2GeneralPriceItem[],
  currency: string,
  planId: string
): React.ReactNode {
  const forCurrency = prices.find((p) => p.currency === currency);
  if (!forCurrency) return null;

  const forPlan = forCurrency.plans.find((p) => p.id === planId);
  if (!forPlan) return null;

  return forPlan.cost;
}
