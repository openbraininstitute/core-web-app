/* eslint-disable react/no-array-index-key */

import { classNames } from '@/util/utils';
import { styleBlockLarge } from '../../styles';
import LargeScreen from './large-screen';
import styles from './PriceList.module.css';
import SmallScreen from './small-screen';

export default function WidgetPriceList() {
  return (
    <div className={classNames(styles.header, styleBlockLarge)}>
      <div>
        <LargeScreen />
        <SmallScreen />
      </div>
    </div>
  );
}
