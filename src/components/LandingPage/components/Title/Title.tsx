import React, { CSSProperties } from 'react';

import {
  styleBlockSmallMarginLeft,
  styleBlockSmall,
  styleBlockSmallExpandRight,
} from '../../styles';
import { classNames } from '@/util/utils';

import styles from './Title.module.css';

interface TitleProps {
  className?: string;
  value: string;
  margin?: string;
  children?: React.ReactNode;
}

export default function Title({ className, value, children, margin }: TitleProps) {
  const style: CSSProperties = {};
  if (margin) {
    style.marginTop = margin;
    style.marginBottom = margin;
  }
  if (children) {
    return (
      <>
        <div className={classNames(styles.title, styleBlockSmallMarginLeft)}>
          <div />
        </div>
        <div className={classNames(className, styleBlockSmallExpandRight, styles.flex)}>
          <h1 style={style}>{value}</h1>
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
      <h1 style={style} className={styleBlockSmall}>
        {value}
      </h1>
    </>
  );
}
