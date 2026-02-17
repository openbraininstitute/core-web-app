import { classNames } from '@/util/utils';

import { styleBlockFullWidth } from '../../styles';

import type React from 'react';

import styles from './CenteredColumn.module.css';

interface CenteredColumnProps {
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
