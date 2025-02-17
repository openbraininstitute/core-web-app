import React from 'react';

import { styleBlockFullWidth } from '../../styles';
import { classNames } from '@/util/utils';

import styles from './CenteredColumn.module.css';

export interface CenteredColumnProps {
  className?: string;
  children: React.ReactNode;
}

export default function CenteredColumn({ className, children }: CenteredColumnProps) {
  return (
    <div className={classNames(className, styles.centeredColumn, styleBlockFullWidth)}>
      <div>{children}</div>
    </div>
  );
}
