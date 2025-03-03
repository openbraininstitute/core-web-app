/* eslint-disable react/no-array-index-key */
import React from 'react';

import { styleBlockLarge } from '../../styles';
import SelectCurrency from '../../components/select-currency';
import SmallScreen from './small-screen';
import LargeScreen from './large-screen';
import { classNames } from '@/util/utils';

import styles from './PriceList.module.css';

export default function WidgetPriceList() {
  return (
    <>
      <div className={classNames(styles.header, styleBlockLarge)}>
        <div>
          <SelectCurrency />
          <LargeScreen />
          <SmallScreen />
        </div>
      </div>
    </>
  );
}
