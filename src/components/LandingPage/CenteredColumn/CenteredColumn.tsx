import React from 'react';

import { classNames } from '@/util/utils';

import styles from './CenteredColumn.module.css';

export interface CenteredColumnProps {
  className?: string;
  maxWidth?: string;
  children: React.ReactNode;
}

export default function CenteredColumn({
  className,
  maxWidth = '800px',
  children,
}: CenteredColumnProps) {
  return (
    <div className={classNames(className, styles.centeredColumn)}>
      <div style={{ maxWidth }}>{children}</div>
    </div>
  );
}
