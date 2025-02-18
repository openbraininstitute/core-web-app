import React from 'react';
import { Select } from 'antd';

import { useCurrency } from '../../atoms';
import { classNames } from '@/util/utils';

import styles from './select-currency.module.css';

export interface SelectCurrencyProps {
  className?: string;
}

export default function SelectCurrency({ className }: SelectCurrencyProps) {
  const [currency, setCurrency] = useCurrency();

  return (
    <div className={classNames(className, styles.selectCurrency)}>
      <Select
        defaultValue={currency}
        style={{ width: 160 }}
        onChange={setCurrency}
        options={[
          { value: 'CHF', label: 'Swiss Franc (CHF)' },
          { value: 'EUR', label: 'Euro (EUR)' },
          { value: 'USD', label: 'Dollar (USD)' },
        ]}
      />
    </div>
  );
}
