/* eslint-disable react/no-array-index-key */

import { styleBlockLarge } from '../../styles';
import LargeScreen from './large-screen';
import SmallScreen from './small-screen';

import { classNames } from '@/util/utils';

import styles from './PriceList.module.css';

export default function WidgetPriceList() {
  return (
    <>
      <div className={classNames(styles.header, styleBlockLarge)}>
        <div>
          <LargeScreen />
          <SmallScreen />
        </div>
      </div>
    </>
  );
}
