import React from 'react';

import {
  styleBlockSmallMarginLeft,
  styleBlockSmall,
  styleBlockSmallExpandRight,
} from '../../styles';
import { classNames } from '@/util/utils';

import styles from './Title.module.css';

export interface TitleProps {
  className?: string;
  value: string;
  children?: React.ReactNode;
}

export default function Title({ className, value, children }: TitleProps) {
  if (children) {
    return (
      <>
        <div className={classNames(styles.title, styleBlockSmallMarginLeft)}>
          <div />
        </div>
        <div className={classNames(className, styleBlockSmallExpandRight, styles.flex)}>
          <h1>{value}</h1>
          <div>{children}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={classNames(className, styles.title, styleBlockSmallMarginLeft)}>
        <div />
      </div>
      <h1 className={styleBlockSmall}>{value}</h1>
    </>
  );
}
