import React from 'react';

import { classNames } from '@/util/utils';

import styles from './Price.module.css';

export interface PriceProps {
  className?: string;
  price: number;
  discount?: number;
  currency?: string;
  children: React.ReactNode;
}

export default function Price({
  className,
  price,
  discount,
  currency = 'CHF',
  children,
}: PriceProps) {
  return (
    <div className={classNames(className, styles.price)}>
      <main>
        <em>Subscription</em>
        {!discount && (
          <div className={styles.bold}>
            {currency} {price} / year
          </div>
        )}
        {discount && (
          <>
            <div className={styles.strike}>
              {currency} {price} / year
            </div>
            <div className={styles.discount}>
              <div className={styles.bold}>
                {currency} {price} / year
              </div>
              <div>Launch price</div>
            </div>
          </>
        )}
        <div>+ extra compute on demand</div>
      </main>
      <footer>
        <em>{children}</em>
      </footer>
    </div>
  );
}
